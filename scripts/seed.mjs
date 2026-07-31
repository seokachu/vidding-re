/**
 * 시드 스크립트 — 화면을 붙이는 동안 쓸 더미 데이터.
 *
 *   pnpm seed          더미 생성 (이미 있으면 건너뛴다)
 *   pnpm seed --clean  기존 시드를 지우고 다시 만든다
 *
 * ## 왜 RPC 를 통해 만드는가
 *
 * 입찰·공감·마감을 테이블에 직접 써 넣으면 **원장과 잔액이 어긋난다.**
 * `close_auction()` 은 "반환 + 이전 = 차감 총액" 이 깨지면 롤백하므로,
 * 손으로 넣은 데이터로는 마감이 아예 실패한다 (데이터 모델 §4.2).
 *
 * 그래서 시드도 실제 흐름을 그대로 밟는다.
 *   가입 → 배송지 → 경매 등록 → 사연 → place_bid → toggle_episode_like → close_auction
 *
 * service_role 키는 **가입·마감·정리에만** 쓴다. 나머지는 그 사용자로 로그인해
 * anon 키로 호출하므로 RLS 를 그대로 통과한다.
 */

import { deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const url = need("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = need("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLEAN = process.argv.includes("--clean");
const PASSWORD = "vidding-seed-2026!";
const BUCKET = "auction-images";

/* --- 사람 -------------------------------------------------------------- */

const PEOPLE = [
  { key: "seoyeon", email: "seed-seoyeon@vidding.test", nick: "서연" },
  { key: "jihun", email: "seed-jihun@vidding.test", nick: "지훈" },
  { key: "minseo", email: "seed-minseo@vidding.test", nick: "민서" },
  { key: "doyun", email: "seed-doyun@vidding.test", nick: "도윤" },
];

/* --- 경매 --------------------------------------------------------------
 * `closeAfter: true` 면 사연·입찰·공감을 다 채운 뒤 마감 시각을 과거로 당기고
 * close_auction() 을 부른다. 낙찰·유찰·채팅방·알림이 전부 실제 경로로 생긴다.
 * ---------------------------------------------------------------------- */

const AUCTIONS = [
  {
    host: "seoyeon",
    title: "필름 카메라 나눔",
    description:
      "아버지가 쓰시던 필름 카메라입니다. 잘 쓸 분께 보내고 싶어요. 어떤 사연이 있는지 들려주세요.",
    color: [29, 72, 176],
    hours: 148, // 6일 4시간
    episodes: [
      {
        author: "jihun",
        title: "아버지의 필름 카메라를 다시 켜고 싶어요",
        content:
          "아버지가 쓰시던 필름 카메라가 작년에 고장 났어요. 같은 기종을 찾다가 여기까지 왔습니다. 남은 필름 여섯 통을 아직 못 쓰고 서랍에 두었는데, 올해가 가기 전에 아버지와 같이 한 통이라도 찍고 싶습니다.",
        bid: 2000,
        likedBy: ["seoyeon", "minseo"],
      },
      {
        author: "minseo",
        title: "첫 흑백 사진을 찍어보고 싶습니다",
        content:
          "디지털로만 찍다가 필름의 기다림이 궁금해졌어요. 현상소까지 걸어가는 그 며칠이 어떤 기분일지 직접 겪어보고 싶습니다.",
        bid: 1500,
        likedBy: ["doyun"],
      },
      {
        author: "doyun",
        title: "할머니 사진을 남겨두고 싶어요",
        content:
          "할머니가 카메라 앞에서만 웃으세요. 남은 시간 동안 제대로 된 사진을 몇 장 남겨두고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "jihun",
    title: "캠핑 의자 2개",
    description: "두 번 쓰고 접어둔 캠핑 의자입니다. 필요한 분께 드릴게요.",
    color: [200, 50, 43],
    hours: 2.7, // 마감 임박 — 목록에서 경고색으로 보인다
    episodes: [
      {
        author: "minseo",
        title: "아버지와 첫 캠핑을 갑니다",
        content:
          "퇴직하신 아버지가 캠핑을 배우고 싶다고 하셨어요. 장비를 하나씩 모으는 중인데 의자가 마지막입니다.",
        bid: 2000,
        likedBy: ["jihun"],
      },
    ],
  },
  {
    host: "seoyeon",
    title: "에스프레소 머신",
    description: "원두를 바꿔가며 잘 썼습니다. 이어서 쓰실 분을 찾아요.",
    color: [22, 55, 132],
    hours: 24,
    closeAfter: true, // 낙찰까지 진행한다
    episodes: [
      {
        author: "doyun",
        title: "작은 책방에 커피를 놓고 싶어요",
        content:
          "동네에 아주 작은 책방을 열었습니다. 오래 머무는 손님께 커피 한 잔을 내어드리고 싶은데 기계가 없어요.",
        bid: 3000,
        likedBy: ["seoyeon", "jihun", "minseo"],
      },
      {
        author: "jihun",
        title: "아침을 다시 만들고 싶습니다",
        content:
          "재택으로 바뀌고부터 하루의 시작이 흐릿해졌어요. 원두를 갈고 내리는 십 분이 그 경계가 되어줄 것 같습니다.",
        bid: 2500,
        likedBy: ["minseo"],
      },
      {
        author: "minseo",
        title: "어머니께 드리고 싶어요",
        content: "커피를 좋아하시는데 늘 봉지 커피만 드세요. 한 번쯤 제대로 된 걸 드리고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "minseo",
    title: "화분 스툴 2개",
    description: "베란다에 두던 스툴입니다. 화분 받침으로 쓰기 좋아요.",
    color: [117, 126, 146],
    hours: 12,
    closeAfter: true,
    episodes: [], // 사연 0건 → 유찰 (F5)
  },
];

/* --- 실행 --------------------------------------------------------------- */

async function main() {
  preflight();

  if (CLEAN) await clean();

  const existing = await findSeedAuction();
  if (existing) {
    console.log(
      `이미 시드된 데이터가 있습니다 ("${existing}"). 다시 만들려면 --clean 을 붙이세요.`,
    );
    return;
  }

  console.log("사람 4명을 만듭니다…");
  const people = new Map();
  for (const person of PEOPLE) {
    people.set(person.key, await createPerson(person));
  }

  for (const spec of AUCTIONS) {
    await seedAuction(spec, people);
  }

  console.log("\n잔액");
  for (const person of PEOPLE) {
    const { data } = await admin
      .from("users")
      .select("nick_name, point_balance")
      .eq("id", people.get(person.key).id)
      .single();
    console.log(`  ${data.nick_name}  ${data.point_balance.toLocaleString()} P`);
  }

  console.log(`\n완료. 로그인해서 보려면 아무 계정이나 쓰세요.`);
  console.log(`  이메일  ${PEOPLE[0].email}`);
  console.log(`  비밀번호 ${PASSWORD}`);
  console.log(
    `  (소셜 로그인만 열려 있으므로, 이 계정으로 들어가려면 대시보드에서 이메일 제공자를 잠깐 켜야 합니다)`,
  );
}

/* --- 사전 검사 ----------------------------------------------------------- */

/**
 * 위 표를 DB 에 넣기 전에 **포인트로 시뮬레이션한다.**
 *
 * 가입 보너스는 5,000 P 뿐이고 입찰은 즉시 차감된다. 반환은 마감 때 온다.
 * 그래서 "마감 전까지 동시에 걸어둔 합"이 5,000 을 넘으면 `place_bid()` 가
 * `INSUFFICIENT_POINTS` 로 거절한다. 계정 4개를 만든 뒤에 알면 늦다.
 *
 * 덤으로 낙찰자와 최종 잔액을 미리 찍어, 표를 고칠 때 결과를 바로 확인할 수 있다.
 */
function preflight() {
  const balance = new Map(PEOPLE.map((p) => [p.key, 5000]));
  const problems = [];

  for (const spec of AUCTIONS) {
    for (const episode of spec.episodes) {
      const left = balance.get(episode.author) - episode.bid;
      if (left < 0) {
        problems.push(
          `${nickOf(episode.author)} — "${spec.title}" 에 ${episode.bid.toLocaleString()} P 를 걸 수 없습니다 ` +
            `(잔액 ${balance.get(episode.author).toLocaleString()} P)`,
        );
      }
      balance.set(episode.author, Math.max(left, 0));
    }

    if (!spec.closeAfter) continue;

    // 점수 = 건 포인트 + 받은 공감 가중치. 주최자의 공감은 50, 그 외는 10 (§11.2)
    const scored = spec.episodes.map((e) => ({
      ...e,
      score:
        e.bid +
        e.likedBy.reduce((sum, k) => sum + (k === spec.host ? 50 : 10), 0),
    }));
    const winner = scored.sort((a, b) => b.score - a.score)[0];

    for (const episode of scored) {
      if (episode === winner) continue;
      balance.set(episode.author, balance.get(episode.author) + episode.bid);
    }
    if (winner) balance.set(spec.host, balance.get(spec.host) + winner.bid);

    console.log(
      `예상 — "${spec.title}" → ${winner ? `${nickOf(winner.author)} (${winner.score.toLocaleString()}점)` : "유찰"}`,
    );
  }

  if (problems.length > 0) {
    console.error("시드 표가 포인트 예산을 넘습니다. DB 는 건드리지 않았습니다.\n");
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      `\n가입 보너스는 1인당 5,000 P 입니다. 반환은 마감 때 오므로,` +
        ` 마감 전까지 동시에 걸어둔 합이 그 안에 들어와야 합니다.`,
    );
    process.exit(1);
  }

  const total = [...balance.values()].reduce((a, b) => a + b, 0);
  console.log(`예상 — 마감 후 잔액 합계 ${total.toLocaleString()} P (나머지는 진행중 경매에 묶임)\n`);
}

function nickOf(key) {
  return PEOPLE.find((p) => p.key === key).nick;
}

/* --- 사람 --------------------------------------------------------------- */

async function createPerson({ email, nick }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nick_name: nick },
  });
  if (error) throw new Error(`${email} 생성 실패: ${error.message}`);

  const id = data.user.id;

  // 가입 트리거가 users 행과 5,000 P 를 만든다. 잠깐 기다린 뒤 확인한다 (F10 4)
  await waitFor(async () => {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return data !== null;
  }, `${email} 의 users 행`);

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`${email} 로그인 실패: ${signInError.message}`);

  // 경매를 열려면 배송지가 먼저 있어야 한다 (F12 3.4)
  const { error: addressError } = await client.from("addresses").insert({
    user_id: id,
    recipient: nick,
    phone: "010-0000-0000",
    zipcode: "04524",
    address1: "서울특별시 중구 세종대로 110",
    address2: "1층",
  });
  if (addressError) throw new Error(`${email} 배송지 실패: ${addressError.message}`);

  const { data: address } = await client
    .from("addresses")
    .select("id")
    .eq("user_id", id)
    .single();

  console.log(`  ${nick} (${email})`);
  return { id, nick, email, client, addressId: address.id };
}

/* --- 경매 --------------------------------------------------------------- */

async function seedAuction(spec, people) {
  const host = people.get(spec.host);
  console.log(`\n경매 "${spec.title}" — 주최자 ${host.nick}`);

  const endAt = new Date(Date.now() + spec.hours * 3600_000).toISOString();

  // 이미지 경로가 경매 ID 를 포함하므로(§11.5 경로 규칙) ID 를 먼저 정하고 올린다.
  // 그래야 image_urls 에 임시값을 넣었다 고치는 중간 상태가 생기지 않는다
  const auctionId = crypto.randomUUID();
  const imageUrl = await uploadCover(host.id, auctionId, spec.color);

  const { data: auction, error } = await host.client
    .from("auctions")
    .insert({
      id: auctionId,
      user_id: host.id,
      address_id: host.addressId,
      title: spec.title,
      description: spec.description,
      image_urls: [imageUrl],
      end_at: endAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`경매 등록 실패: ${error.message}`);

  for (const episodeSpec of spec.episodes) {
    const author = people.get(episodeSpec.author);

    const { data: episode, error: episodeError } = await author.client
      .from("episodes")
      .insert({
        auction_id: auction.id,
        user_id: author.id,
        title: episodeSpec.title,
        content: episodeSpec.content,
      })
      .select("id")
      .single();
    if (episodeError) throw new Error(`사연 실패: ${episodeError.message}`);

    // 입찰은 place_bid() 로만 한다. 잔액·원장이 한 트랜잭션에서 함께 움직인다 (§4.1)
    const { error: bidError } = await author.client.rpc("place_bid", {
      p_episode_id: episode.id,
      p_new_amount: episodeSpec.bid,
    });
    if (bidError) throw new Error(`입찰 실패: ${bidError.message}`);

    // 가중치는 서버가 정한다. 주최자면 50, 그 외는 10 (§4.4 · §11.2)
    for (const likerKey of episodeSpec.likedBy) {
      const liker = people.get(likerKey);
      const { error: likeError } = await liker.client.rpc(
        "toggle_episode_like",
        { p_episode_id: episode.id },
      );
      if (likeError) throw new Error(`공감 실패: ${likeError.message}`);
    }

    console.log(
      `  사연 "${episodeSpec.title}" — ${author.nick} · ${episodeSpec.bid.toLocaleString()} P · 공감 ${episodeSpec.likedBy.length}`,
    );
  }

  if (!spec.closeAfter) return;

  // 마감 시각을 과거로 당긴다. 컬럼 GRANT 때문에 이건 service_role 로만 된다
  await admin
    .from("auctions")
    .update({ end_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", auction.id);

  // 크론(1분 주기)이 먼저 처리했으면 close_auction 은 그대로 돌려준다 (§9 중복 방지)
  const { data: closed, error: closeError } = await admin.rpc("close_auction", {
    p_auction_id: auction.id,
  });
  if (closeError) throw new Error(`마감 실패: ${closeError.message}`);

  if (closed.winning_episode_id) {
    const { data: winner } = await admin
      .from("episodes")
      .select("title, users(nick_name)")
      .eq("id", closed.winning_episode_id)
      .single();
    console.log(`  → 낙찰: ${winner.users.nick_name} "${winner.title}"`);
  } else {
    console.log("  → 유찰 (사연 0건)");
  }
}

/* --- 이미지 -------------------------------------------------------------- */

/**
 * 단색 PNG 를 만들어 공개 버킷에 올린다.
 *
 * 버킷이 jpg/png/webp 만 받으므로 (§11.5) 실제 PNG 를 만들어야 한다.
 * 의존성을 늘리지 않으려고 최소 PNG 를 직접 엮는다 — 64×64 단색이면 충분하다.
 */
async function uploadCover(userId, auctionId, rgb) {
  const png = solidPng(64, 64, rgb);
  const path = `${userId}/${auctionId}/cover.png`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);

  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function solidPng(width, height, [r, g, b]) {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* --- 정리 --------------------------------------------------------------- */

/**
 * 지우는 순서가 중요하다.
 *
 *   경매 → 배송지 → 인증 계정
 *
 * `episodes.user_id` 와 `auctions.user_id` 는 CASCADE 가 아니다. 경매를 먼저
 * 지우지 않으면 계정 삭제가 FK 에 막힌다 (supabase/README.md 10).
 */
async function clean() {
  console.log("기존 시드를 지웁니다…");

  const ids = [];
  for (const { email } of PEOPLE) {
    const id = await findAuthUserId(email);
    if (id) ids.push(id);
  }
  if (ids.length === 0) {
    console.log("  지울 것이 없습니다.");
    return;
  }

  const { data: auctions } = await admin
    .from("auctions")
    .select("id, user_id")
    .in("user_id", ids);

  for (const auction of auctions ?? []) {
    await admin.storage
      .from(BUCKET)
      .remove([`${auction.user_id}/${auction.id}/cover.png`]);
  }

  await admin.from("auctions").delete().in("user_id", ids);
  await admin.from("addresses").delete().in("user_id", ids);

  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`계정 삭제 실패: ${error.message}`);
  }

  console.log(`  계정 ${ids.length}개와 그 데이터를 지웠습니다.`);
}

async function findSeedAuction() {
  const { data } = await admin
    .from("auctions")
    .select("title")
    .in(
      "title",
      AUCTIONS.map((a) => a.title),
    )
    .limit(1)
    .maybeSingle();
  return data?.title ?? null;
}

async function findAuthUserId(email) {
  // admin.listUsers 는 페이지 단위다. 시드 계정 수가 적으므로 첫 장이면 충분하다
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(`계정 조회 실패: ${error.message}`);
  return data.users.find((u) => u.email === email)?.id ?? null;
}

/* --- 도구 --------------------------------------------------------------- */

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `환경 변수 ${name} 가 없습니다.\n` +
        `.env.example 을 .env.local 로 복사해 값을 채운 뒤 다시 실행하세요.`,
    );
    process.exit(1);
  }
  return value;
}

async function waitFor(check, what, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${what} 가 준비되지 않았습니다.`);
}

/* ------------------------------------------------------------------------
 * 진입점은 맨 아래에 둔다. 위에 두면 top-level await 가 아래쪽 `const` 들보다
 * 먼저 실행돼 TDZ 에 걸린다 (함수 선언과 달리 const 는 끌어올려지지 않는다).
 * ---------------------------------------------------------------------- */
await main();
