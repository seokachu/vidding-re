/**
 * 경매 자동 활성화 — 홈이 늘 살아 있게 하루 1건을 올리고 반응을 나눠 채운다.
 *
 * GitHub Actions 크론(하루 4회)마다 실행되어:
 *  1) 오늘(KST) 시드 계정이 올린 경매가 없으면 새 경매 1건 등록
 *     — 풀(scripts/data/auction-daily-pool.mjs)에 안 올린 품목이 있으면 그걸,
 *       없으면 **마감된 지 7일 지난 경매를 재등록**한다 (사진은 그대로 재사용).
 *       그래서 풀이 비어도 자동화는 무한히 돈다.
 *  2) 진행중 경매에 예정 시각이 지난 사연·입찰·공감을 그때그때 나눠 등록
 *     — 경매 하나가 등록 직후엔 조용하다가 며칠에 걸쳐 반응이 쌓이는 것처럼 보인다.
 *
 * 실행: pnpm auction:daily            (실제 반영)
 *       pnpm auction:daily --dry-run  (변경 없이 계획만 출력)
 *
 * ## 왜 테이블에 직접 쓰지 않는가 (seed.mjs 와 같은 이유)
 *
 * 입찰·공감을 직접 써 넣으면 원장과 잔액이 어긋나 close_auction() 이 롤백된다.
 * 그래서 실제 사용자 흐름을 그대로 밟는다 — 매직링크로 로그인해 anon 키로
 * 사연을 올리고 place_bid() / toggle_episode_like() 를 부른다. RLS 를 그대로
 * 통과하므로 정책이 바뀌면 이 스크립트도 실제 사용자처럼 같이 막힌다.
 *
 * ## 포인트가 마르면?
 *
 * 시드 계정 잔액이 입찰액에 못 미치면 그 입찰은 건너뛰고 다음 실행에 재시도한다.
 * 진행중 경매가 마감되면 포인트가 반환·이전되므로(§4.2) 시간이 지나면 저절로 풀린다.
 *
 * 마감 처리 자체는 Supabase pg_cron 이 1분 주기로 하고 있어 여기서 할 일이 없다
 * (supabase/migrations/20260731000006_cron.sql).
 */

import { DAILY_POOL, photoUrl } from "./data/auction-daily-pool.mjs";

const SUPABASE_URL = need("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = need("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = need("SUPABASE_SERVICE_ROLE_KEY");
const DRY_RUN = process.argv.includes("--dry-run");

const BUCKET = "auction-images";
const RECYCLE_COOLDOWN_DAYS = 7; // 마감 후 이만큼 지나야 같은 품목을 다시 올린다

/* --- REST 도구 -----------------------------------------------------------
 * supabase-js 없이 PostgREST·GoTrue·Storage 를 직접 부른다.
 * 의존성이 없으면 Actions 에서 pnpm install 없이 바로 실행된다 (ive 와 동일).
 * ------------------------------------------------------------------------ */

async function rest(path, { token = SERVICE_KEY, apikey, ...init } = {}) {
  const res = await fetchRetry(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: apikey ?? (token === SERVICE_KEY ? SERVICE_KEY : ANON_KEY),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const select = (path) => rest(path);
const insertAs = (token, table, row) =>
  rest(table, {
    token,
    method: "POST",
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
  });
const rpcAs = (token, fn, args) =>
  rest(`rpc/${fn}`, { token, method: "POST", body: JSON.stringify(args) });

/** 네트워크가 삐끗한 것만 몇 번 다시 시도한다. HTTP 오류는 그대로 돌려준다 */
async function fetchRetry(url, init, attempts = 4) {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (i < attempts) await sleep(1500 * i);
    }
  }
  throw new Error(`${url.split("?")[0]} 요청 실패: ${lastError.message}`);
}

/* --- 로그인 ---------------------------------------------------------------
 * 이메일 제공자가 꺼져 있어도 되는 경로 — 매직링크 토큰을 만들어 바로 검증한다.
 * /verify 는 IP 당 30회/5분 제한이 있어(GoTrue 기본값) 429 면 기다렸다 재시도.
 * ------------------------------------------------------------------------ */

const tokenCache = new Map();

async function login(email) {
  if (tokenCache.has(email)) return tokenCache.get(email);

  for (let attempt = 1; ; attempt += 1) {
    const linkRes = await fetchRetry(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "magiclink", email }),
    });
    const link = await linkRes.json();
    if (!linkRes.ok) throw new Error(`${email} 토큰 생성 실패: ${JSON.stringify(link)}`);
    const tokenHash = link.hashed_token ?? link.properties?.hashed_token;

    const verifyRes = await fetchRetry(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", token_hash: tokenHash }),
    });
    const session = await verifyRes.json();
    if (verifyRes.ok && session.access_token) {
      tokenCache.set(email, session.access_token);
      return session.access_token;
    }

    if (verifyRes.status !== 429 || attempt >= 8) {
      throw new Error(`${email} 로그인 실패: ${verifyRes.status} ${JSON.stringify(session)}`);
    }
    console.log(`  (${email} 로그인 속도 제한 — 20초 뒤 재시도)`);
    await sleep(20_000);
  }
}

/* --- 시각·해시 도구 ------------------------------------------------------- */

const NOW = new Date();
const KST = 9 * 60 * 60 * 1000;
const kstDateKey = (date) => new Date(date.getTime() + KST).toISOString().slice(0, 10);
const TODAY = kstDateKey(NOW);
const HOUR = 60 * 60 * 1000;

// 결정적 해시 — 같은 입력이면 항상 같은 값. 실행 시점이 달라도 계획이 흔들리지 않는다
const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

/** i번째 사연의 등록 예정 시각 — 등록 후 6~35시간 간격으로 차례차례 쌓인다 */
function episodeDueAt(auction, i, count) {
  const created = new Date(auction.created_at).getTime();
  const duration = new Date(auction.end_at).getTime() - created;
  let offset = 0;
  for (let k = 0; k <= i; k += 1) offset += (6 + (hash(`${auction.title}#ep${k}`) % 30)) * HOUR;
  // 짧은 경매(재등록된 임박 품목 등)에서는 마감 전에 다 들어가게 균등 압축한다
  if (offset > duration - 2 * HOUR) offset = (duration * (i + 1)) / (count + 1);
  return new Date(created + offset);
}

/** j번째 공감의 예정 시각 — 사연 등록 후 3~22시간 간격 */
function likeDueAt(auction, epDue, i, j) {
  const offset = (j + 1) * (3 + (hash(`${auction.title}#ep${i}L${j}`) % 20)) * HOUR;
  const end = new Date(auction.end_at).getTime();
  return new Date(Math.min(epDue.getTime() + offset, end - 1 * HOUR));
}

/* --- 메인 ----------------------------------------------------------------- */

async function main() {
  // 시드 계정 전원 — 이메일 규칙(seed-<키>@vidding.test)으로 찾는다
  const users = await select(
    `users?select=id,email,nick_name,point_balance&email=like.${encodeURIComponent("seed-*@vidding.test")}`,
  );
  if (!users.length) throw new Error("시드 계정이 없습니다. 먼저 pnpm seed 를 실행하세요.");
  const byKey = new Map(users.map((u) => [u.email.slice("seed-".length, u.email.indexOf("@")), u]));
  const byId = new Map(users.map((u) => [u.id, u]));
  const balances = new Map(users.map((u) => [u.id, u.point_balance]));
  const seedIds = users.map((u) => u.id);

  // 시드 계정의 경매 전부 — 최신순이라 제목별 첫 행이 곧 최신 회차다
  const auctions = await select(
    `auctions?select=id,user_id,title,description,image_urls,status,end_at,created_at,closed_at` +
      `&user_id=in.(${seedIds.join(",")})&order=created_at.desc`,
  );
  const latestByTitle = new Map();
  for (const a of auctions) if (!latestByTitle.has(a.title)) latestByTitle.set(a.title, a);

  // 1. 오늘 몫의 새 경매 — 시드 계정 기준 하루 1건
  const postedToday = auctions.filter((a) => kstDateKey(new Date(a.created_at)) === TODAY);
  const fresh = DAILY_POOL.filter((item) => !latestByTitle.has(item.title));
  const recyclable = [...latestByTitle.values()]
    .filter(
      (a) =>
        a.status === "CLOSED" &&
        a.closed_at &&
        NOW.getTime() - new Date(a.closed_at).getTime() > RECYCLE_COOLDOWN_DAYS * 24 * HOUR,
    )
    .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at)); // 오래 쉰 것부터

  if (postedToday.length > 0) {
    console.log(`오늘 등록된 경매 ${postedToday.length}건 — 새 등록 없이 반응만 갱신`);
  } else if (fresh.length > 0) {
    await postFromPool(fresh.shift(), byKey);
  } else if (recyclable.length > 0) {
    await repost(recyclable.shift(), byId);
  } else {
    console.log("오늘 올릴 것이 없습니다 — 풀 소진, 재등록 대기 품목도 없음");
  }

  // 2. 진행중 경매에 사연·입찰·공감 드립
  //    (풀 품목이거나 재등록 품목만 — seed.mjs 가 처음부터 채워 둔 경매는 계획이 없다)
  const open = auctions.filter(
    (a) => a.status === "OPEN" && new Date(a.end_at).getTime() > NOW.getTime() + 5 * 60 * 1000,
  );
  for (const auction of open) {
    const plan = await planFor(auction, auctions, byKey);
    if (plan) await drip(auction, plan, byId, balances);
  }

  // 3. 풀 상태 — 재등록이 있어 실패시키진 않지만, 새 품목이 고픈 건 알려준다
  console.log(
    `\n풀 ${DAILY_POOL.length}건 중 남음 ${fresh.length} · 지금 재등록 가능 ${recyclable.length}`,
  );
  if (!fresh.length) {
    console.warn("[알림] 새 품목 풀이 소진되어 재등록으로 돌고 있습니다. scripts/data/auction-daily-pool.mjs 에 품목을 추가하면 새 물건이 섞입니다.");
  }
}

/* --- 등록: 풀 품목 --------------------------------------------------------- */

async function postFromPool(item, byKey) {
  const host = byKey.get(item.host);
  if (!host) throw new Error(`시드 계정에 없는 키: ${item.host}`);
  if (DRY_RUN) return console.log(`[dry-run] 새 경매 등록 예정 — "${item.title}" (${host.nick_name})`);

  const [address] = await select(`addresses?select=id&user_id=eq.${host.id}&limit=1`);
  if (!address) throw new Error(`${host.email} 의 배송지가 없습니다.`);

  // 이미지 경로가 경매 ID 를 포함하므로 ID 를 먼저 정하고 올린다 (seed.mjs 와 동일)
  const auctionId = crypto.randomUUID();
  const imageUrls = [];
  for (const [i, entry] of item.photos.entries()) {
    const bytes = await download(photoUrl(entry), entry);
    const path = `${host.id}/${auctionId}/cover-${i + 1}.jpg`;
    const res = await fetchRetry(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!res.ok) throw new Error(`이미지 업로드 실패 (${entry}): ${res.status} ${await res.text()}`);
    imageUrls.push(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  }

  const token = await login(host.email);
  await insertAs(token, "auctions", {
    id: auctionId,
    user_id: host.id,
    address_id: address.id,
    title: item.title,
    description: item.description,
    image_urls: imageUrls,
    end_at: new Date(NOW.getTime() + item.hours * HOUR).toISOString(),
  });
  console.log(`새 경매 등록 — "${item.title}" (${host.nick_name}, ${item.hours}시간)`);
}

/* --- 등록: 마감된 경매 재등록 ----------------------------------------------
 * 내용·사진을 그대로 새 경매로 올린다. 사진은 저장소에 남아 있는 기존 파일의
 * 공개 URL 을 재사용하므로 다시 내려받지 않는다. 사연·입찰은 drip 이 원본
 * 회차의 기록을 계획 삼아 며칠에 걸쳐 다시 채운다.
 * ------------------------------------------------------------------------ */

async function repost(source, byId) {
  const host = byId.get(source.user_id);
  if (DRY_RUN) return console.log(`[dry-run] 재등록 예정 — "${source.title}" (${host.nick_name})`);

  const [address] = await select(`addresses?select=id&user_id=eq.${host.id}&limit=1`);
  if (!address) throw new Error(`${host.email} 의 배송지가 없습니다.`);

  // 원래 열려 있던 시간만큼 다시 연다. seed 가 마감시키려고 end_at 을 과거로
  // 당겨 둔 경매는 음수가 나오므로 그때는 7일로 연다.
  let hours = Math.round(
    (new Date(source.end_at).getTime() - new Date(source.created_at).getTime()) / HOUR,
  );
  if (hours < 12 || hours > 168) hours = 168;

  const token = await login(host.email);
  await insertAs(token, "auctions", {
    id: crypto.randomUUID(),
    user_id: host.id,
    address_id: address.id,
    title: source.title,
    description: source.description,
    image_urls: source.image_urls,
    end_at: new Date(NOW.getTime() + hours * HOUR).toISOString(),
  });
  console.log(`재등록 — "${source.title}" (${host.nick_name}, ${hours}시간)`);
}

/* --- 드립 계획 -------------------------------------------------------------
 * 계획 = [{authorId, title, content, bid, likedByIds}] 형태로 통일한다.
 *  - 풀 품목: 풀의 사연 명세에서
 *  - 재등록 품목: 직전 마감 회차의 사연·공감 기록에서
 * ------------------------------------------------------------------------ */

async function planFor(auction, auctions, byKey) {
  const poolItem = DAILY_POOL.find((item) => item.title === auction.title);
  if (poolItem) {
    return poolItem.episodes.map((ep) => ({
      authorId: byKey.get(ep.author)?.id,
      title: ep.title,
      content: ep.content,
      bid: ep.bid,
      likedByIds: ep.likedBy.map((key) => byKey.get(key)?.id).filter(Boolean),
    }));
  }

  // 같은 제목의 직전 마감 회차 — 있으면 재등록된 경매다
  const source = auctions.find(
    (a) => a.title === auction.title && a.id !== auction.id && a.status === "CLOSED",
  );
  if (!source) return null; // seed.mjs 가 만든 첫 회차 — 이미 채워져 있으므로 손대지 않는다

  const episodes = await select(
    `episodes?select=id,user_id,title,content,bid_amount&auction_id=eq.${source.id}&order=created_at.asc`,
  );
  if (!episodes.length) return [];
  const likes = await select(
    `episode_likes?select=episode_id,user_id&episode_id=in.(${episodes.map((e) => e.id).join(",")})`,
  );
  return episodes.map((ep) => ({
    authorId: ep.user_id,
    title: ep.title,
    content: ep.content,
    bid: ep.bid_amount,
    likedByIds: likes.filter((l) => l.episode_id === ep.id).map((l) => l.user_id),
  }));
}

/* --- 드립 실행 ------------------------------------------------------------ */

async function drip(auction, plan, byId, balances) {
  if (!plan.length) return;
  const existing = await select(
    `episodes?select=id,user_id,title,bid_amount&auction_id=eq.${auction.id}`,
  );
  const existingLikes = existing.length
    ? await select(
        `episode_likes?select=episode_id,user_id&episode_id=in.(${existing.map((e) => e.id).join(",")})`,
      )
    : [];

  for (const [i, ep] of plan.entries()) {
    const due = episodeDueAt(auction, i, plan.length);
    if (due > NOW) continue;

    // 사연 — 같은 제목이 이미 있으면 그 행을 쓴다 (이전 실행이 올린 것)
    let row = existing.find((e) => e.title === ep.title);
    if (!row) {
      const author = pickAuthor(ep, auction, existing, byId, balances);
      if (!author) {
        console.log(`  사연 보류 — "${auction.title}" ← 올릴 수 있는 계정 없음 (잔액 부족)`);
        continue;
      }
      if (DRY_RUN) {
        console.log(`[dry-run] 사연 등록 예정 — "${auction.title}" ← ${author.nick_name}`);
        continue;
      }
      const token = await login(author.email);
      [row] = await insertAs(token, "episodes", {
        auction_id: auction.id,
        user_id: author.id,
        title: ep.title,
        content: ep.content,
      });
      existing.push(row);
      console.log(`사연 등록 — "${auction.title}" ← ${author.nick_name} "${ep.title}"`);
    }

    // 입찰 — place_bid 는 총액을 받는다. 차액만큼 잔액이 있어야 한다
    if (ep.bid > 0 && row.bid_amount < ep.bid) {
      const author = byId.get(row.user_id);
      const diff = ep.bid - row.bid_amount;
      if ((balances.get(author.id) ?? 0) < diff) {
        console.log(`  입찰 보류 — ${author.nick_name} 잔액 부족 (${diff.toLocaleString()} P 필요)`);
      } else if (DRY_RUN) {
        console.log(`[dry-run] 입찰 예정 — "${auction.title}" ${author.nick_name} ${ep.bid.toLocaleString()} P`);
      } else {
        const token = await login(author.email);
        await rpcAs(token, "place_bid", { p_episode_id: row.id, p_new_amount: ep.bid });
        balances.set(author.id, balances.get(author.id) - diff);
        row.bid_amount = ep.bid;
        console.log(`입찰 — "${auction.title}" ${author.nick_name} ${ep.bid.toLocaleString()} P`);
      }
    }

    // 공감 — toggle 이라 두 번 부르면 풀리므로 이미 눌린 건 건드리지 않는다
    for (const [j, likerId] of ep.likedByIds.entries()) {
      if (likeDueAt(auction, due, i, j) > NOW) continue;
      const liker = byId.get(likerId);
      if (!liker || likerId === row.user_id) continue; // 자기 사연엔 공감 불가 (RLS)
      if (existingLikes.some((l) => l.episode_id === row.id && l.user_id === likerId)) continue;
      if (DRY_RUN) {
        console.log(`[dry-run] 공감 예정 — "${ep.title}" ← ${liker.nick_name}`);
        continue;
      }
      const token = await login(liker.email);
      await rpcAs(token, "toggle_episode_like", { p_episode_id: row.id });
      existingLikes.push({ episode_id: row.id, user_id: likerId });
      console.log(`공감 — "${ep.title}" ← ${liker.nick_name}`);
    }
  }
}

/**
 * 사연 작성자 고르기 — 명세의 작성자가 주최자가 아니고 아직 이 경매에 사연이
 * 없고 잔액이 입찰액 이상이면 그대로, 아니면 조건을 채우는 다른 시드 계정으로.
 * 사연은 전부 1인칭 일반 문체라 누가 올려도 어색하지 않다.
 */
function pickAuthor(ep, auction, existing, byId, balances) {
  const taken = new Set(existing.map((e) => e.user_id));
  const fits = (id) =>
    id !== auction.user_id && !taken.has(id) && (balances.get(id) ?? 0) >= ep.bid;

  if (ep.authorId && fits(ep.authorId)) return byId.get(ep.authorId);
  const candidates = [...byId.keys()].filter(fits);
  if (!candidates.length) return null;
  return byId.get(candidates[hash(auction.id + ep.title) % candidates.length]);
}

/* --- 이미지 다운로드 -------------------------------------------------------- */

const downloadCache = new Map();

async function download(source, label, attempts = 3) {
  if (downloadCache.has(source)) return downloadCache.get(source);
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      downloadCache.set(source, bytes);
      return bytes;
    } catch (error) {
      lastError = error;
      if (i < attempts) await sleep(500 * i);
    }
  }
  throw new Error(`사진 "${label}" 을 받지 못했습니다: ${lastError.message}`);
}

/* --- 잡동사니 --------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`환경 변수 ${name} 가 없습니다.`);
    process.exit(1);
  }
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
