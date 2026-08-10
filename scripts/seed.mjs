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
 *
 * ## 로그인 방식 — 이메일 제공자를 켤 필요가 없다
 *
 * 예전에는 이메일＋비밀번호 로그인을 썼는데, 서비스는 소셜 둘만 제공하므로
 * (F10 3.1) 시드를 돌릴 때마다 대시보드에서 이메일 제공자를 켰다 꺼야 했다.
 * 지금은 `admin.generateLink()` 로 매직링크 토큰을 만들어 `verifyOtp()` 로
 * 세션을 얻는다. **이 경로는 이메일 제공자가 꺼져 있어도 동작한다** (검증됨).
 */

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

/* --- 사진 --------------------------------------------------------------
 * Unsplash 직링크. 키 없이 받을 수 있고 상업 이용도 무료다.
 * 경매의 `photos` 가 이 표의 키를 가리킨다. `키@square`·`키@closeup` 처럼
 * 쓰면 같은 사진의 다른 크롭을 만든다 — 보조 사진이 따로 없는 품목의
 * 2·3번째 컷을 이걸로 채운다 (전체샷·클로즈업처럼 보인다).
 * ---------------------------------------------------------------------- */

const PHOTOS = {
  // 기존 21종
  "film-camera": "1532800181046-044ce9bfd577",
  "camping-chair": "1516659583110-c59d8926c33a",
  "espresso-machine": "1627398621538-918a69017d28",
  "wooden-stool": "1773389061469-53969f48e7e2",
  "wooden-desk": "1714973148365-6db2ef41d7c7",
  "vintage-bicycle": "1765798811107-3e6948d50dc5",
  turntable: "1634650254521-b1596c5a2d37",
  "acoustic-guitar": "1654721355119-40e84bf6d951",
  "hiking-backpack": "1609865898563-93d63b3daa64",
  "electric-kettle": "1615634376875-f8999ce75a25",
  "pet-carrier": "1635094544840-dbcd03874f06",
  "baby-stroller": "1663579168345-8e955020f8ef",
  bookshelf: "1524401597352-ec4463663233",
  "area-rug": "1600166931532-604e927c794b",
  "potted-plant": "1596388454571-8dd77023e9fa",
  "camping-tent": "1602079108581-4c5071154299",
  "floor-lamp": "1738355120576-50093baa24a6",
  "board-game": "1596687909057-dfac2b25b891",
  "yoga-mat": "1599447472329-449d9e262420",
  "coffee-grinder": "1778297308133-fc55ba28e4a1",
  microwave: "1608384156808-418b5c079968",

  // 추가 품목 (전부 200 확인)
  dslr: "1495707902641-75cac588d2e9", // 캐논 DSLR
  "dslr-lenses": "1516035069371-29a1b244cc32", // 렌즈 구성
  polaroid: "1526170375885-4d8ecf77b99f",
  "tlr-camera": "1495121553079-4c61bcce1894", // 이안리플렉스
  headphones: "1505740420928-5e560c06d30e",
  "bt-speaker": "1608043152269-423dbba4e7e1",
  "speaker-pair": "1545454675-3531b543be5d",
  keyboard: "1587829741301-dc798b83add3",
  "keyboard-desk": "1498049794561-7780e7231661",
  laptop: "1496181133206-80ce9b88a853",
  monitor: "1527443224154-c4a3942d3acf",
  smartphone: "1511707171634-5f897ff02aa9",
  wristwatch: "1524592094714-0f0654e20314",
  "wristwatch-b": "1434056886845-dac89ffe9b56",
  smartwatch: "1523275335684-37898b6baf30",
  "travel-backpack": "1491637639811-60e2756cc1c7",
  "travel-backpack-b": "1547949003-9792a18a2601",
  "daily-backpack": "1553062407-98eeb64c6a62",
  handbag: "1584917865442-de89df76afd3",
  basketball: "1519861531473-9200262188bf",
  "basketball-hoop": "1546519638-68e109498ffc",
  "running-shoes": "1542291026-7eec264c27ff",
  vans: "1525966222134-fcfa99b8ae77",
  "sofa-green": "1555041469-a586c61ea9bc",
  armchair: "1586023492125-27b2c045efd7",
  "electric-guitar": "1516924962500-2b4b3b99ea02",
  "acoustic-playing": "1510915361894-db8b60106cb1",
  "book-stack": "1512820790803-83ca734da794",
  "book-open": "1509021436665-8f07dbf5bf1d",
  "book-grass": "1476275466078-4007374efbbe",
  "book-shelves": "1481627834876-b7833e8f5570",
  cactus: "1459411552884-841db9b3cc2a",
  succulent: "1485955900006-10f4d324d411",
  "garden-tools": "1416879595882-3373a0480b5b",
  "cup-set": "1610701596007-11502861dcfa",
  "tea-cup": "1544787219-7f47ccb76574",
  blender: "1585515320310-259814833e62",
  "toaster-oven": "1574269909862-7e1d70bb8078",
  "nintendo-switch": "1578303512597-81e6cc155b3e",
  playstation: "1606144042614-b2417e99c4e3",
  "playing-tv": "1493711662062-fa541adb3fc8",
  suitcase: "1565026057447-bc90a3dceb87",
  "tennis-racket": "1622163642998-1ea32b0bbc67",
  "tennis-court": "1554068865-24cecd4e34b8",
  barbell: "1517836357463-d25dfeac3438",
  "fixie-bike": "1485965120184-e220f721d03e",
  "turntable-playing": "1603048588665-791ca8aea617",
};

const VARIANTS = {
  square: "&h=1080&crop=entropy",
  closeup: "&h=810&crop=focalpoint&fp-x=0.42&fp-y=0.45&fp-z=1.7",
};

/** "키" 또는 "키@square"·"키@closeup" 를 실제 URL 로 푼다 */
function photoUrl(entry) {
  const [key, variant] = entry.split("@");
  const id = PHOTOS[key];
  if (!id) throw new Error(`PHOTOS 에 "${key}" 가 없습니다.`);
  const extra = variant ? VARIANTS[variant] : "";
  if (variant && !extra) throw new Error(`변형 "${variant}" 는 없습니다.`);
  return `https://images.unsplash.com/photo-${id}?w=1080&q=80&fm=jpg&fit=crop${extra}`;
}

/* --- 사람 -------------------------------------------------------------- */

const PEOPLE = [
  { key: "seoyeon", nick: "서연" },
  { key: "jihun", nick: "지훈" },
  { key: "minseo", nick: "민서" },
  { key: "doyun", nick: "도윤" },
  { key: "haeun", nick: "하은" },
  { key: "junwoo", nick: "준우" },
  { key: "yerin", nick: "예린" },
  { key: "siwoo", nick: "시우" },
  { key: "chaewon", nick: "채원" },
  { key: "taeyang", nick: "태양" },
  { key: "sohee", nick: "소희" },
  { key: "minjun", nick: "민준" },
  { key: "jiwoo", nick: "지우" },
  { key: "eunseo", nick: "은서" },
  { key: "hyunwoo", nick: "현우" },
  { key: "nayeon", nick: "나연" },
  { key: "hajun", nick: "하준" },
  { key: "seowoo", nick: "서우" },
  { key: "jia", nick: "지아" },
  { key: "yuna", nick: "유나" },
  { key: "gunwoo", nick: "건우" },
  { key: "sua", nick: "수아" },
  { key: "jiho", nick: "지호" },
  { key: "arin", nick: "아린" },
  { key: "siyeon", nick: "시연" },
  { key: "dohyun", nick: "도현" },
  { key: "yejun", nick: "예준" },
  { key: "ayun", nick: "아윤" },
  { key: "eunwoo", nick: "은우" },
  { key: "seojin", nick: "서진" },
  { key: "daeun", nick: "다은" },
  { key: "roun", nick: "로운" },
].map((p) => ({ ...p, email: `seed-${p.key}@vidding.test` }));

/* --- 경매 --------------------------------------------------------------
 * `closeAfter: true` 면 사연·입찰·공감을 다 채운 뒤 마감 시각을 과거로 당기고
 * close_auction() 을 부른다. 낙찰·유찰·채팅방·알림이 전부 실제 경로로 생긴다.
 *
 * `photos` 는 1~3장. 목록·상세의 이미지 상태를 골고루 보려고
 * 3장 14개 / 2장 30개 / 1장 10개로 섞어 두었다.
 * ---------------------------------------------------------------------- */

const AUCTIONS = [
  /* --- 마감된 것 셋 — 먼저 둔다 ------------------------------------------
   * 마감이 반환·이전을 일으켜 뒤에 오는 경매의 포인트 예산을 풀어준다.
   * 목록에서도 오래된 순으로 아래에 깔린다.
   * -------------------------------------------------------------------- */
  {
    host: "seoyeon",
    title: "에스프레소 머신",
    description: "원두를 바꿔가며 잘 썼습니다. 이어서 쓰실 분을 찾아요.",
    photos: ["espresso-machine", "espresso-machine@closeup"],
    hours: 24,
    closeAfter: true, // 낙찰까지 진행한다 — 채팅방과 낙찰 알림이 여기서 생긴다
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
        content:
          "커피를 좋아하시는데 늘 봉지 커피만 드세요. 한 번쯤 제대로 된 걸 드리고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "minseo",
    title: "화분 스툴 2개",
    description: "베란다에 두던 스툴입니다. 화분 받침으로 쓰기 좋아요.",
    photos: ["wooden-stool"],
    hours: 12,
    closeAfter: true,
    episodes: [], // 사연 0건 → 유찰 (F5)
  },
  {
    host: "haeun",
    title: "원목 책상",
    description: "이사하면서 자리가 없어졌어요. 상판이 넓어 작업하기 좋습니다.",
    photos: ["wooden-desk", "wooden-desk@closeup"],
    hours: 24,
    closeAfter: true,
    episodes: [
      {
        author: "junwoo",
        title: "졸업 작품을 여기서 끝내고 싶어요",
        content:
          "식탁에서 도면을 그리다 보니 밥때마다 치워야 합니다. 남은 두 달만이라도 펼쳐둔 채로 두고 싶어요.",
        bid: 2000,
        likedBy: ["haeun"],
      },
      {
        author: "yerin",
        title: "재봉틀을 올려두려고 합니다",
        content:
          "바닥에 두고 쓰다 허리가 상했어요. 튼튼한 상판이 필요합니다.",
        bid: 1500,
        likedBy: ["siwoo"],
      },
    ],
  },

  /* --- 진행중 — 전부 7일 ---------------------------------------------------
   * 주말에 열어두고 평일 내내 살아 있어야 한다. 168시간으로 통일한다.
   * -------------------------------------------------------------------- */
  {
    host: "seoyeon",
    title: "필름 카메라 나눔",
    description:
      "아버지가 쓰시던 필름 카메라입니다. 잘 쓸 분께 보내고 싶어요. 어떤 사연이 있는지 들려주세요.",
    photos: ["film-camera", "film-camera@closeup", "film-camera@square"],
    hours: 168,
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
    photos: ["camping-chair", "camping-chair@closeup"],
    hours: 168,
    episodes: [
      {
        author: "minseo",
        title: "아버지와 첫 캠핑을 갑니다",
        content:
          "퇴직하신 아버지가 캠핑을 배우고 싶다고 하셨어요. 장비를 하나씩 모으는 중인데 의자가 마지막입니다.",
        bid: 2000,
        likedBy: ["jihun"],
      },
      {
        author: "haeun",
        title: "옥상에 앉을 자리를 만들고 싶어요",
        content:
          "옥상이 비어 있는데 앉을 데가 없어 다들 서서 이야기하다 내려갑니다. 두 자리면 충분해요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "minseo",
    title: "빈티지 자전거",
    description: "몇 해 탔습니다. 체인만 갈면 아직 잘 나가요.",
    photos: ["vintage-bicycle", "vintage-bicycle@square", "vintage-bicycle@closeup"],
    hours: 168,
    episodes: [
      {
        author: "doyun",
        title: "출근길을 되찾고 싶습니다",
        content:
          "지하철 두 정거장인데 사람에 치여 아침마다 지칩니다. 강변으로 돌아가더라도 페달을 밟고 싶어요.",
        bid: 1000,
        likedBy: ["minseo"],
      },
      {
        author: "junwoo",
        title: "아이에게 물려주려고요",
        content:
          "제 첫 자전거도 얻어 탄 것이었어요. 딸아이가 이제 그 나이가 됐습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "doyun",
    title: "턴테이블",
    description: "판을 정리하면서 같이 보냅니다. 바늘은 새로 갈아 두었어요.",
    photos: ["turntable", "turntable-playing", "turntable@closeup"],
    hours: 168,
    episodes: [
      {
        author: "yerin",
        title: "아버지 레코드를 틀어보고 싶어요",
        content:
          "아버지가 남기신 판이 상자째 있는데 틀 방법이 없어 몇 해째 그대로입니다. 무슨 소리가 들어 있는지 아직 모릅니다.",
        bid: 2000,
        likedBy: ["doyun", "siwoo"],
      },
      {
        author: "siwoo",
        title: "가게에 소리를 들이고 싶습니다",
        content:
          "작은 공방을 하는데 하루 종일 기계 소리만 납니다. 손님이 오면 판 한 장 올려두고 싶어요.",
        bid: 1500,
        likedBy: ["chaewon"],
      },
      {
        author: "chaewon",
        title: "잠들기 전 한 면씩",
        content:
          "자기 전에 휴대폰을 놓지 못해요. 한 면이 끝나면 일어나야 하는 물건이 필요합니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "yerin",
    title: "어쿠스틱 기타",
    description: "대학 때부터 쓰던 기타입니다. 소리는 아직 좋아요.",
    photos: ["acoustic-guitar", "acoustic-playing"],
    hours: 168,
    episodes: [
      {
        author: "siwoo",
        title: "병실에서 칠 수 있는 악기를 찾습니다",
        content:
          "어머니가 오래 누워 계셔서 병실에 자주 있습니다. 소리가 크지 않게 조용히 몇 곡 치고 싶어요.",
        bid: 2000,
        likedBy: ["yerin"],
      },
      {
        author: "taeyang",
        title: "다시 배워보려고요",
        content:
          "스무 살에 세 달 배우고 접었습니다. 그때 못 친 곡이 아직 마음에 남아 있어요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "siwoo",
    title: "등산 배낭",
    description: "50리터짜리입니다. 종주 두 번 하고 모셔뒀어요.",
    photos: ["hiking-backpack", "hiking-backpack@closeup"],
    hours: 168,
    episodes: [
      {
        author: "chaewon",
        title: "지리산을 걸어보려고 합니다",
        content:
          "올해는 꼭 종주하겠다고 새해에 적어뒀는데 아직 배낭이 없습니다. 여름 가기 전에 떠나고 싶어요.",
        bid: 2000,
        likedBy: ["siwoo"],
      },
      {
        author: "sohee",
        title: "아이와 야영을 갑니다",
        content:
          "짐이 늘어 제 가방으로는 감당이 안 됩니다. 아이 몫까지 지려면 큰 게 필요해요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "chaewon",
    title: "전기 주전자",
    description: "이사하며 두 개가 됐어요. 하나는 보냅니다.",
    photos: ["electric-kettle"],
    hours: 168,
    episodes: [
      {
        author: "taeyang",
        title: "자취 첫 살림입니다",
        content:
          "냄비에 물을 끓이다 몇 번 태웠어요. 아침마다 급한데 이게 있으면 훨씬 나을 것 같습니다.",
        bid: 1000,
        likedBy: ["chaewon"],
      },
      {
        author: "minjun",
        title: "사무실에 두려고요",
        content:
          "탕비실이 없어 다들 차를 못 마십니다. 구석에 하나 두면 겨울이 견딜 만해질 거예요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "taeyang",
    title: "반려견 이동장",
    description: "중형견용입니다. 아이가 커서 이제 안 맞아요.",
    photos: ["pet-carrier", "pet-carrier@closeup"],
    hours: 168,
    episodes: [
      {
        author: "sohee",
        title: "유기견을 데려오려고 합니다",
        content:
          "보호소에서 만난 아이를 데려오기로 했어요. 첫날 안전하게 데려올 것이 필요합니다.",
        bid: 2000,
        likedBy: ["taeyang", "minjun"],
      },
      {
        author: "jiwoo",
        title: "병원 다닐 일이 잦아졌어요",
        content:
          "노견이라 한 달에 두 번은 병원에 갑니다. 안고 가기엔 이제 무거워요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "sohee",
    title: "유모차",
    description: "둘째까지 잘 썼습니다. 바퀴 상태 좋아요.",
    photos: ["baby-stroller", "baby-stroller@square", "baby-stroller@closeup"],
    hours: 168,
    episodes: [
      {
        author: "minjun",
        title: "첫 아이를 기다립니다",
        content:
          "다음 달이 예정일인데 아직 준비를 못 했어요. 새것까지는 욕심이고 튼튼한 것이면 됩니다.",
        bid: 2000,
        likedBy: ["sohee"],
      },
      {
        author: "eunseo",
        title: "친정에 하나 두려고요",
        content:
          "주말마다 아이를 데리고 가는데 매번 접어 싣는 게 일입니다. 한 대를 그쪽에 두고 싶어요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "minjun",
    title: "책장",
    description: "5단 원목 책장입니다. 흠집은 조금 있어요.",
    photos: ["bookshelf", "book-shelves", "bookshelf@closeup"],
    hours: 168,
    episodes: [
      {
        author: "jiwoo",
        title: "바닥에 쌓인 책을 세우고 싶어요",
        content:
          "방 한쪽이 책탑입니다. 밟고 지나다니다 몇 권은 표지가 다 상했어요.",
        bid: 1500,
        likedBy: ["minjun"],
      },
      {
        author: "hyunwoo",
        title: "작은 도서관을 만들려고요",
        content:
          "아파트 공동 공간에 책을 모으는 중입니다. 놓을 데가 없어 상자에 담아만 뒀어요.",
        bid: 2000,
        likedBy: [],
      },
    ],
  },
  {
    host: "jiwoo",
    title: "러그",
    description: "150×200 사이즈입니다. 세탁해서 보냅니다.",
    photos: ["area-rug"],
    hours: 168,
    episodes: [
      {
        author: "eunseo",
        title: "아랫집에 미안해서요",
        content:
          "아이가 뛰기 시작하면서 매일 조마조마합니다. 거실만이라도 깔아두고 싶어요.",
        bid: 2000,
        likedBy: ["jiwoo"],
      },
      {
        author: "nayeon",
        title: "첫 자취방을 꾸며봅니다",
        content:
          "바닥이 차가워서 앉을 엄두가 안 나요. 하나 깔면 방이 방 같아질 것 같습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "eunseo",
    title: "화분",
    description: "분갈이하며 나온 여분입니다. 흙은 없어요.",
    photos: ["potted-plant", "potted-plant@closeup"],
    hours: 168,
    episodes: [
      {
        author: "hyunwoo",
        title: "병실 창가에 두려고요",
        content:
          "아버지가 입원해 계신데 창밖만 보십니다. 초록색을 하나 놓아드리고 싶어요.",
        bid: 1000,
        likedBy: ["eunseo"],
      },
      {
        author: "nayeon",
        title: "식물을 처음 키워봅니다",
        content:
          "여러 번 죽였어요. 이번엔 제대로 배워서 오래 두고 보고 싶습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "hyunwoo",
    title: "4인용 텐트",
    description: "두 시즌 썼습니다. 방수 상태 좋아요.",
    photos: ["camping-tent", "camping-tent@square", "camping-tent@closeup"],
    hours: 168,
    episodes: [
      {
        author: "nayeon",
        title: "가족 여행을 다시 시작하려고요",
        content:
          "아이들이 크면서 여행이 끊겼어요. 올여름엔 다 같이 한 번 나가보고 싶습니다.",
        bid: 2000,
        likedBy: ["hyunwoo"],
      },
      {
        author: "seoyeon",
        title: "혼자 하룻밤 자보려고 합니다",
        content:
          "올해 정신없이 지냈어요. 조용한 데서 하루만 자고 오면 좀 나아질 것 같습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "nayeon",
    title: "스탠드 조명",
    description: "높이 조절되는 플로어 스탠드입니다. 전구 포함이에요.",
    photos: ["floor-lamp", "floor-lamp@closeup"],
    hours: 168,
    episodes: [
      {
        author: "seoyeon",
        title: "밤에 책 읽을 자리를 만들고 싶어요",
        content:
          "천장등이 너무 밝아 눈이 아픕니다. 구석에 하나 두고 거기서만 읽고 싶어요.",
        bid: 2000,
        likedBy: ["nayeon"],
      },
      {
        author: "haeun",
        title: "작업대가 어두워요",
        content:
          "저녁에 그림을 그리는데 손 그림자가 종이를 덮습니다. 옆에서 비춰줄 것이 필요해요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "haeun",
    title: "보드게임 모음",
    description: "여섯 종류입니다. 구성품은 다 있어요.",
    photos: ["board-game", "board-game@square"],
    hours: 168,
    episodes: [
      {
        author: "junwoo",
        title: "동아리 방에 두려고 합니다",
        content:
          "시험 끝나면 다들 갈 데가 없어 흩어져요. 모여 앉을 핑계가 하나 있으면 좋겠습니다.",
        bid: 1500,
        likedBy: ["haeun"],
      },
      {
        author: "seoyeon",
        title: "가족이 화면을 좀 덜 보게요",
        content:
          "저녁마다 각자 방에서 각자 화면을 봅니다. 식탁에 펼쳐둘 것이 필요해요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "junwoo",
    title: "요가 매트",
    description: "두께 6mm입니다. 미끄럼 방지 잘 돼요.",
    photos: ["yoga-mat"],
    hours: 168,
    episodes: [
      {
        author: "haeun",
        title: "허리 재활을 시작합니다",
        content:
          "물리치료 받으면서 집에서도 하라고 하셨는데 맨바닥이라 자꾸 미룹니다.",
        bid: 1000,
        likedBy: ["junwoo"],
      },
      {
        author: "yerin",
        title: "아침 십 분을 만들어보려고요",
        content:
          "일어나자마자 휴대폰을 봅니다. 펴놓을 자리가 있으면 몸부터 움직일 것 같아요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "nayeon",
    title: "커피 그라인더",
    description: "수동 그라인더입니다. 날 상태 좋아요.",
    photos: ["coffee-grinder", "coffee-grinder@closeup"],
    hours: 168,
    episodes: [
      {
        author: "chaewon",
        title: "원두를 사두고 못 갈고 있어요",
        content:
          "선물 받은 원두가 두 봉지째 그대로입니다. 향이 다 날아가기 전에 마시고 싶어요.",
        bid: 1000,
        likedBy: ["nayeon"],
      },
      {
        author: "sohee",
        title: "캠핑장에서 내려 마시려고요",
        content:
          "전기 없는 데를 주로 다닙니다. 손으로 가는 것이 필요해요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },

  /* --- 여기부터 새 품목 33개 — 전부 7일 --------------------------------- */
  {
    host: "hajun",
    title: "DSLR 카메라",
    description:
      "몇 년 잘 쓴 DSLR입니다. 렌즈 두 개 같이 드려요. 셔터 잘 작동합니다.",
    photos: ["dslr", "dslr-lenses", "dslr@closeup"],
    hours: 168,
    episodes: [
      {
        author: "seowoo",
        title: "아이 첫 운동회를 찍고 싶어요",
        content:
          "휴대폰으로는 뛰는 아이가 자꾸 흐리게 나와요. 다음 달 운동회에서는 제대로 남겨주고 싶습니다.",
        bid: 2000,
        likedBy: ["hajun"],
      },
      {
        author: "jia",
        title: "사진 동아리에 들어갔습니다",
        content:
          "장비가 없어 매번 빌려 씁니다. 제 카메라로 과제전을 준비하고 싶어요.",
        bid: 1500,
        likedBy: ["gunwoo"],
      },
      {
        author: "gunwoo",
        title: "부모님 여행에 들려 보내드리려고요",
        content:
          "두 분이 처음으로 긴 여행을 가세요. 좋은 사진 남기시라고 챙겨드리고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "seowoo",
    title: "폴라로이드 카메라",
    description: "필름 몇 장 남은 폴라로이드입니다. 즉석 사진 감성 그대로예요.",
    photos: ["polaroid", "polaroid@closeup"],
    hours: 168,
    episodes: [
      {
        author: "yuna",
        title: "카페 손님 사진을 붙여두고 싶어요",
        content:
          "작은 카페를 하는데 한쪽 벽이 허전합니다. 다녀간 분들 사진으로 채우고 싶어요.",
        bid: 1500,
        likedBy: ["seowoo"],
      },
      {
        author: "hajun",
        title: "친구 결혼식에서 쓰려고요",
        content:
          "식장에서 바로 뽑아 방명록에 붙이면 좋은 선물이 될 것 같습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "jia",
    title: "빈티지 이안 카메라",
    description:
      "할아버지가 쓰시던 이안리플렉스 카메라입니다. 장식장에만 두기 아까워요.",
    photos: ["tlr-camera", "tlr-camera@closeup"],
    hours: 168,
    episodes: [
      {
        author: "hajun",
        title: "필름 사진을 수집합니다",
        content:
          "오래된 카메라로 찍는 모임을 하고 있어요. 이런 기종은 처음이라 꼭 다뤄보고 싶습니다.",
        bid: 1500,
        likedBy: ["jia"],
      },
      {
        author: "sua",
        title: "소품 촬영용으로 쓰고 싶어요",
        content:
          "빈티지 소품 대여 일을 합니다. 진짜 물건이 주는 힘이 있어요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "yuna",
    title: "헤드폰",
    description: "출퇴근길에 쓰던 헤드폰입니다. 음질 좋고 귀가 편해요.",
    photos: ["headphones", "headphones@closeup", "headphones@square"],
    hours: 168,
    episodes: [
      {
        author: "jiho",
        title: "야간 편집 작업이 많습니다",
        content:
          "밤에 영상 편집을 하는데 스피커를 못 켭니다. 이어폰은 귀가 아파서 오래 못 써요.",
        bid: 2000,
        likedBy: ["yuna", "arin"],
      },
      {
        author: "arin",
        title: "지하철 소음이 힘들어요",
        content:
          "통근이 왕복 세 시간입니다. 그 시간만이라도 조용히 음악을 듣고 싶어요.",
        bid: 1000,
        likedBy: [],
      },
      {
        author: "jihun",
        title: "라디오 듣는 밤을 되찾고 싶어요",
        content:
          "가족들이 잠든 뒤에 라디오를 듣습니다. 소리를 낮춰도 눈치가 보여요.",
        bid: 1000,
        likedBy: ["jiho"],
      },
    ],
  },
  {
    host: "gunwoo",
    title: "블루투스 스피커",
    description: "캠핑 때 쓰던 블루투스 스피커입니다. 배터리 오래 가요.",
    photos: ["bt-speaker", "bt-speaker@closeup"],
    hours: 168,
    episodes: [
      {
        author: "siyeon",
        title: "옥상 모임에 음악을 더하고 싶어요",
        content:
          "한 달에 한 번 이웃들과 옥상에서 모입니다. 음악이 없으니 어색한 순간이 많아요.",
        bid: 1500,
        likedBy: ["gunwoo"],
      },
      {
        author: "dohyun",
        title: "세차할 때 들으려고요",
        content:
          "주말마다 셀프 세차장에 갑니다. 두 시간이 금방 가게 해줄 물건이에요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "sua",
    title: "스피커 한 쌍",
    description: "북쉘프 스피커 한 쌍입니다. 소리가 따뜻해요.",
    photos: ["speaker-pair", "speaker-pair@closeup"],
    hours: 168,
    episodes: [
      {
        author: "yejun",
        title: "거실에 음악을 틀고 싶습니다",
        content:
          "TV 소리 말고 음악이 흐르는 집을 만들고 싶어요. 아이도 음악을 좋아합니다.",
        bid: 2000,
        likedBy: ["sua", "gunwoo"],
      },
      {
        author: "gunwoo",
        title: "작업실 소리를 바꾸고 싶어요",
        content:
          "낡은 모니터 스피커 하나로 버텨왔습니다. 좋은 소리로 일하고 싶어요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "jiho",
    title: "무선 키보드",
    description: "무선 키보드입니다. 키감 좋고 배터리 오래 갑니다.",
    photos: ["keyboard", "keyboard-desk"],
    hours: 168,
    episodes: [
      {
        author: "ayun",
        title: "태블릿으로 과제를 씁니다",
        content:
          "노트북이 없어 태블릿으로 리포트를 써요. 화면 키보드로는 한 문단이 한나절입니다.",
        bid: 1000,
        likedBy: ["jiho"],
      },
      {
        author: "eunwoo",
        title: "식탁 사무실에 필요해요",
        content:
          "재택 근무를 식탁에서 합니다. 노트북 키보드만 치다 손목이 아파졌어요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "arin",
    title: "노트북",
    description: "몇 년 쓴 노트북입니다. 배터리 갈았고 문서 작업은 거뜬해요.",
    photos: ["laptop", "laptop@closeup", "laptop@square"],
    hours: 168,
    episodes: [
      {
        author: "seojin",
        title: "자격증 공부를 시작합니다",
        content:
          "회사를 나와 새 일을 준비 중이에요. 인강을 들을 컴퓨터가 없습니다.",
        bid: 2000,
        likedBy: ["arin", "daeun"],
      },
      {
        author: "daeun",
        title: "아이 온라인 수업용이에요",
        content:
          "둘째가 입학하는데 컴퓨터가 한 대뿐입니다. 수업이 겹치는 날마다 난감해요.",
        bid: 1500,
        likedBy: [],
      },
      {
        author: "roun",
        title: "소설을 쓰고 싶습니다",
        content:
          "휴대폰 메모장에 쓴 글이 수백 개예요. 이제 제대로 옮겨 적고 싶습니다.",
        bid: 1000,
        likedBy: ["seojin"],
      },
    ],
  },
  {
    host: "siyeon",
    title: "27인치 모니터",
    description: "27인치 모니터입니다. 화면 밝고 깨끗해요.",
    photos: ["monitor", "monitor@closeup"],
    hours: 168,
    episodes: [
      {
        author: "roun",
        title: "노트북 화면이 너무 작아요",
        content:
          "번역 일을 하는데 창 두 개를 못 띄웁니다. 목이 자꾸 앞으로 나가요.",
        bid: 1500,
        likedBy: ["siyeon"],
      },
      {
        author: "jia",
        title: "동생 게임 화면을 만들어주고 싶어요",
        content:
          "수험 끝난 동생에게 약속한 게 있습니다. 모니터가 그 마지막 조각이에요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "dohyun",
    title: "스마트폰 공기계",
    description: "쓰던 공기계입니다. 초기화해서 드려요. 배터리 상태 양호합니다.",
    photos: ["smartphone", "smartphone@closeup", "smartphone@square"],
    hours: 168,
    episodes: [
      {
        author: "eunwoo",
        title: "할머니 첫 스마트폰이에요",
        content:
          "영상통화를 하고 싶다 하셔서요. 큰 화면으로 손주 얼굴 보여드리고 싶습니다.",
        bid: 2000,
        likedBy: ["dohyun", "hyunwoo"],
      },
      {
        author: "hyunwoo",
        title: "아이 등하교 연락용입니다",
        content:
          "초등학생이라 새 폰은 이르고, 연락만 되면 충분해요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "yejun",
    title: "손목시계 2점",
    description:
      "손목시계 두 점입니다. 하나는 가죽줄, 하나는 메탈이에요. 둘 다 잘 갑니다.",
    photos: ["wristwatch", "wristwatch-b"],
    hours: 168,
    episodes: [
      {
        author: "daeun",
        title: "면접용 시계가 필요해요",
        content:
          "취업 준비 중입니다. 면접장에 휴대폰을 못 들고 가서 시계가 있으면 좋겠어요.",
        bid: 1000,
        likedBy: ["yejun"],
      },
      {
        author: "seoyeon",
        title: "아버지 생신 선물로 드리고 싶습니다",
        content:
          "시계를 좋아하시는데 몇 년째 같은 것만 차세요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "ayun",
    title: "스마트워치",
    description: "스마트워치입니다. 스트랩 두 개 같이 드려요.",
    photos: ["smartwatch"],
    hours: 168,
    episodes: [],
  },
  {
    host: "eunwoo",
    title: "여행용 백팩",
    description: "배낭여행 두 번 다녀온 백팩입니다. 수납이 넉넉해요.",
    photos: ["travel-backpack", "travel-backpack-b"],
    hours: 168,
    episodes: [
      {
        author: "sua",
        title: "제주 한 달을 준비합니다",
        content:
          "퇴사하고 한 달 걷기로 했어요. 캐리어 대신 등에 지고 다닐 가방이 필요합니다.",
        bid: 2000,
        likedBy: ["eunwoo"],
      },
      {
        author: "minseo",
        title: "학원 짐이 너무 많아요",
        content:
          "노트북에 교재까지 매일 어깨가 무너집니다. 튼튼한 가방이 절실해요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "seojin",
    title: "데일리 백팩",
    description: "출근용으로 쓰던 백팩입니다. 노트북 칸 있어요.",
    photos: ["daily-backpack"],
    hours: 168,
    episodes: [],
  },
  {
    host: "daeun",
    title: "핸드백",
    description: "몇 번 안 든 핸드백입니다. 상태 새것에 가까워요.",
    photos: ["handbag", "handbag@closeup"],
    hours: 168,
    episodes: [
      {
        author: "arin",
        title: "첫 출근 가방이 필요합니다",
        content:
          "다음 주부터 첫 회사에 나가요. 면접 때 들었던 에코백뿐이라서요.",
        bid: 1500,
        likedBy: ["daeun"],
      },
      {
        author: "yuna",
        title: "어머니 칠순 선물이에요",
        content:
          "평생 장바구니만 드셨어요. 고운 가방 하나 드리고 싶습니다.",
        bid: 1000,
        likedBy: ["arin"],
      },
    ],
  },
  {
    host: "roun",
    title: "농구공",
    description: "실외용 농구공입니다. 바람 잘 차 있어요.",
    photos: ["basketball", "basketball-hoop"],
    hours: 168,
    episodes: [
      {
        author: "jiho",
        title: "아들과 저녁 운동을 시작했어요",
        content:
          "학원 끝난 아들과 삼십 분씩 공을 던집니다. 빌린 공을 돌려줄 때가 됐어요.",
        bid: 1000,
        likedBy: ["roun"],
      },
      {
        author: "hajun",
        title: "동네 코트에 공이 없습니다",
        content:
          "퇴근하고 모이는 동호회인데 공이 낡아 튀지 않아요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "hajun",
    title: "러닝화 265mm",
    description: "발에 안 맞아 몇 번 못 신은 러닝화입니다. 265mm예요.",
    photos: ["running-shoes", "running-shoes@closeup"],
    hours: 168,
    episodes: [
      {
        author: "gunwoo",
        title: "마라톤 완주가 목표입니다",
        content:
          "가을 대회에 신청했어요. 지금 신발로는 무릎이 버티질 못합니다.",
        bid: 1500,
        likedBy: ["hajun"],
      },
      {
        author: "siyeon",
        title: "출근 전 달리기를 시작했어요",
        content:
          "운동화가 낡아 비 오면 물이 스며요. 계속 달리고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "seowoo",
    title: "단화 240mm",
    description: "몇 번 신은 단화입니다. 240mm, 상태 좋아요.",
    photos: ["vans"],
    hours: 168,
    episodes: [
      {
        author: "ayun",
        title: "교생 실습을 나갑니다",
        content:
          "운동화는 안 되고 구두는 하루를 못 버텨요. 단화가 딱입니다.",
        bid: 1500,
        likedBy: ["seowoo"],
      },
      {
        author: "jihun",
        title: "딸아이 졸업식에 신고 가려고요",
        content:
          "정장에 맞출 신발이 없습니다. 한 번은 갖춰 입고 싶어요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "jia",
    title: "3인용 소파",
    description: "3인용 패브릭 소파입니다. 이사 가는 집이 좁아 못 가져가요.",
    photos: ["sofa-green", "sofa-green@closeup", "sofa-green@square"],
    hours: 168,
    episodes: [
      {
        author: "yejun",
        title: "거실에 앉을 곳이 없습니다",
        content:
          "이사 와서 반 년째 바닥 생활이에요. 아이가 소파 있는 집을 부러워합니다.",
        bid: 1500,
        likedBy: ["jia", "seowoo"],
      },
      {
        author: "seowoo",
        title: "부모님 댁 소파가 무너졌어요",
        content:
          "스프링이 내려앉아 방석을 겹쳐 쓰세요. 바꿔드리고 싶습니다.",
        bid: 1000,
        likedBy: [],
      },
      {
        author: "taeyang",
        title: "합주실 쉼터를 만들려고요",
        content:
          "동호회 합주실에 쉴 자리가 없어 다들 바닥에 앉습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "yuna",
    title: "1인용 암체어",
    description: "1인용 암체어입니다. 색이 예뻐서 거실 포인트로 좋아요.",
    photos: ["armchair", "armchair@closeup"],
    hours: 168,
    episodes: [
      {
        author: "dohyun",
        title: "책 읽는 자리를 만들고 싶습니다",
        content:
          "침대에서 읽다 매번 잠들어요. 앉아서 읽는 의자가 있으면 달라질 것 같습니다.",
        bid: 2000,
        likedBy: ["yuna"],
      },
      {
        author: "eunseo",
        title: "수유 의자가 필요해요",
        content:
          "밤중 수유 때 바닥에 앉으면 허리가 끊어질 것 같아요.",
        bid: 1000,
        likedBy: ["dohyun"],
      },
    ],
  },
  {
    host: "gunwoo",
    title: "일렉 기타",
    description: "일렉 기타입니다. 케이블 같이 드려요. 앰프는 없습니다.",
    photos: ["electric-guitar", "electric-guitar@closeup"],
    hours: 168,
    episodes: [
      {
        author: "seojin",
        title: "밴드부 아이들에게 주고 싶습니다",
        content:
          "학교 밴드부 기타가 한 대뿐이라 번갈아 칩니다.",
        bid: 1500,
        likedBy: ["gunwoo"],
      },
      {
        author: "siwoo",
        title: "혼자 녹음을 해보고 싶어요",
        content:
          "통기타만 쳤는데 곡에 일렉 소리가 필요해졌습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "sua",
    title: "책 서른 권 묶음",
    description: "소설이랑 에세이 서른 권쯤 됩니다. 상태 좋은 것만 골랐어요.",
    photos: ["book-stack", "book-open", "book-grass"],
    hours: 168,
    episodes: [
      {
        author: "daeun",
        title: "병원 대기실에 두려고 합니다",
        content:
          "요양병원에서 일해요. 어르신들이 기다리는 시간이 길어요.",
        bid: 1000,
        likedBy: ["sua"],
      },
      {
        author: "hyunwoo",
        title: "아파트 작은 도서관에 보태려고요",
        content:
          "책장은 마련했는데 채울 책이 부족합니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "jiho",
    title: "선인장·다육 화분 2개",
    description: "선인장과 다육이 화분 두 개입니다. 물 자주 안 줘도 잘 커요.",
    photos: ["cactus", "succulent"],
    hours: 168,
    episodes: [
      {
        author: "yuna",
        title: "카페 창가에 두고 싶어요",
        content:
          "햇빛이 잘 드는 자리가 비어 있습니다. 초록이 있으면 손님들도 좋아하실 거예요.",
        bid: 1000,
        likedBy: ["jiho"],
      },
      {
        author: "minjun",
        title: "아이와 처음 키워보려고요",
        content:
          "생명을 돌보는 걸 가르쳐주고 싶은데 강아지는 아직 무리라서요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "arin",
    title: "원예 도구 세트",
    description: "모종삽이랑 원예 도구들입니다. 베란다 텃밭 접으면서 내놓아요.",
    photos: ["garden-tools"],
    hours: 168,
    episodes: [],
  },
  {
    host: "siyeon",
    title: "도자기 컵 세트",
    description: "도자기 컵 네 개 세트입니다. 이 빠진 곳 없어요.",
    photos: ["cup-set", "tea-cup"],
    hours: 168,
    episodes: [
      {
        author: "eunwoo",
        title: "손님상이 부끄러워서요",
        content:
          "집들이마다 종이컵을 내놓았습니다. 이제 제대로 대접하고 싶어요.",
        bid: 1000,
        likedBy: ["siyeon"],
      },
      {
        author: "jiwoo",
        title: "차 마시는 모임을 시작했어요",
        content:
          "동네 분들과 차를 마시는데 잔이 다 제각각입니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "dohyun",
    title: "믹서기",
    description: "과일 갈아 먹던 믹서기입니다. 날 잘 들어요.",
    photos: ["blender"],
    hours: 168,
    episodes: [],
  },
  {
    host: "yejun",
    title: "오븐 토스터",
    description: "오븐 토스터입니다. 그라탕까지는 거뜬해요.",
    photos: ["toaster-oven", "toaster-oven@closeup"],
    hours: 168,
    episodes: [
      {
        author: "sua",
        title: "아침을 챙겨 먹고 싶습니다",
        content:
          "빵 하나 굽는 게 별건데 그 별게 하루를 바꾸더라고요.",
        bid: 1500,
        likedBy: ["yejun"],
      },
      {
        author: "chaewon",
        title: "아이 간식을 만들어주려고요",
        content:
          "시판 간식만 주다 보니 마음에 걸렸어요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "ayun",
    title: "닌텐도 스위치",
    description: "닌텐도 스위치입니다. 게임 칩 두 개 같이 드려요.",
    photos: ["nintendo-switch", "nintendo-switch@closeup"],
    hours: 168,
    episodes: [
      {
        author: "roun",
        title: "입원한 조카 선물입니다",
        content:
          "병실에만 있는 조카가 심심하다는 말만 해요. 웃을 거리를 주고 싶습니다.",
        bid: 2000,
        likedBy: ["ayun", "seowoo"],
      },
      {
        author: "seowoo",
        title: "가족 게임 시간을 만들고 싶어요",
        content:
          "각자 휴대폰만 보는 저녁이 아까워요. 같이 웃을 거리가 필요합니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "eunwoo",
    title: "플레이스테이션",
    description: "플레이스테이션 본체와 패드 하나입니다. 잘 작동해요.",
    photos: ["playstation", "playing-tv", "playstation@closeup"],
    hours: 168,
    episodes: [
      {
        author: "hajun",
        title: "동생과 같이 하던 게임이에요",
        content:
          "군대 간 동생이 휴가 나오면 같이 하려고요. 본체를 팔아버린 걸 후회하고 있습니다.",
        bid: 1500,
        likedBy: ["eunwoo"],
      },
      {
        author: "yerin",
        title: "재활 치료에 쓰려고 합니다",
        content:
          "손 재활 중인데 게임이 도움이 된다고 들었어요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "seojin",
    title: "기내용 캐리어",
    description: "기내용 캐리어입니다. 바퀴 잘 굴러가요.",
    photos: ["suitcase", "suitcase@closeup"],
    hours: 168,
    episodes: [
      {
        author: "jia",
        title: "첫 해외 출장을 갑니다",
        content:
          "여행 가방이 없어 매번 보스턴백을 멨어요.",
        bid: 1500,
        likedBy: ["seojin"],
      },
      {
        author: "sohee",
        title: "친정 갈 때마다 짐이 많아요",
        content:
          "아이 짐까지 양손 가득이라 캐리어가 절실합니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "daeun",
    title: "테니스 라켓",
    description: "테니스 라켓입니다. 그립 새로 감았어요.",
    photos: ["tennis-racket", "tennis-court"],
    hours: 168,
    episodes: [
      {
        author: "siyeon",
        title: "동호회에 새로 들어갔어요",
        content:
          "빌린 라켓으로 석 달을 쳤습니다. 제 것이 갖고 싶어요.",
        bid: 1500,
        likedBy: ["daeun"],
      },
      {
        author: "haeun",
        title: "아버지와 주말마다 칩니다",
        content:
          "아버지 라켓만 두 개라 번갈아 쳐요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "roun",
    title: "바벨·원판 세트",
    description: "홈트용 바벨과 원판입니다. 층간소음 매트도 같이 드려요.",
    photos: ["barbell"],
    hours: 168,
    episodes: [],
  },
  {
    host: "jihun",
    title: "픽시 자전거",
    description: "픽시 자전거입니다. 가볍고 잘 나가요.",
    photos: ["fixie-bike", "fixie-bike@closeup", "fixie-bike@square"],
    hours: 168,
    episodes: [
      {
        author: "seoyeon",
        title: "강변 출근을 해보려고요",
        content:
          "버스 두 번 갈아타는 길이 자전거로는 이십 분이에요.",
        bid: 2000,
        likedBy: ["jihun"],
      },
      {
        author: "dohyun",
        title: "자전거 출사를 다니고 싶습니다",
        content:
          "사진 찍으러 다닐 발이 필요해요. 차는 세울 데가 마땅치 않습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },

  /* --- 마감 임박 하나 -----------------------------------------------------
   * 나머지가 전부 7일이면 **빨간 '마감 임박' 배지를 볼 수 없다.** 배지는
   * 남은 시간이 24시간(`ENDING_SOON_MS`) 안일 때만 켜지기 때문이다.
   * 그 상태도 화면 스펙(S02)에 있으므로 하나는 임박한 채로 둔다.
   * 23시간이라 오늘 넣으면 내일까지 배지가 켜져 있다.
   * -------------------------------------------------------------------- */
  {
    host: "jihun",
    title: "전자레인지",
    description: "이사 날짜가 잡혀서 급하게 내놓습니다. 작동 잘 돼요.",
    photos: ["microwave", "microwave@closeup"],
    hours: 23,
    episodes: [
      {
        author: "taeyang",
        title: "자취방에 하나 들이려고요",
        content:
          "편의점 도시락을 사와도 데울 데가 없어 찬 걸 그냥 먹습니다. 겨울이 오기 전에 하나 두고 싶어요.",
        bid: 1000,
        likedBy: ["jihun"],
      },
      {
        author: "jiwoo",
        title: "어머니 병간호 중입니다",
        content:
          "죽을 데워 드려야 하는데 매번 냄비를 씁니다. 밤중에 불 켜는 게 눈치 보여요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
];

/* --- 실행 --------------------------------------------------------------- */

async function main() {
  preflight();

  if (CLEAN) await clean();

  // 시드는 멱등이다 — 이미 있는 계정·경매·사연·입찰·공감은 건너뛰고 빠진 것만
  // 채운다. 중간에 죽어도 --clean 없이 다시 돌리면 이어서 만든다.
  console.log(`사람 ${PEOPLE.length}명을 만듭니다…`);
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
 * `INSUFFICIENT_POINTS` 로 거절한다. 계정을 다 만든 뒤에 알면 늦다.
 *
 * 덤으로 낙찰자와 최종 잔액을 미리 찍어, 표를 고칠 때 결과를 바로 확인할 수 있다.
 */
function preflight() {
  const balance = new Map(PEOPLE.map((p) => [p.key, 5000]));
  const problems = [];

  for (const spec of AUCTIONS) {
    if (spec.photos.length < 1 || spec.photos.length > 3) {
      problems.push(`"${spec.title}" — 이미지는 1~3장이어야 합니다 (${spec.photos.length}장)`);
    }
    for (const entry of spec.photos) photoUrl(entry); // 키·변형 오타를 여기서 잡는다

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
    console.error("시드 표가 제약을 넘습니다. DB 는 건드리지 않았습니다.\n");
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
  let id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nick_name: nick },
  });
  if (error) {
    // 이전 실행이 만들어 둔 계정이면 그대로 쓴다 (멱등)
    const alreadyExists =
      error.code === "email_exists" || /already been registered/i.test(error.message);
    if (!alreadyExists) throw new Error(`${email} 생성 실패: ${error.message}`);
    id = await findAuthUserId(email);
    if (!id) throw new Error(`${email} — 있다는데 찾을 수 없습니다.`);
  } else {
    id = data.user.id;
  }

  // 가입 트리거가 users 행과 5,000 P 를 만든다. 잠깐 기다린 뒤 확인한다 (F10 4)
  await waitFor(async () => {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return data !== null;
  }, `${email} 의 users 행`);

  // 이메일 제공자가 꺼져 있어도 되는 로그인 — 매직링크 토큰을 만들어 바로 검증한다.
  // /verify 는 IP 당 30회/5분으로 제한되므로(GoTrue 기본값) 계정이 많으면
  // 중간에 429 가 온다. 그때는 토큰 버킷이 다시 찰 때까지 기다렸다 재시도한다.
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (let attempt = 1; ; attempt += 1) {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw new Error(`${email} 토큰 생성 실패: ${linkError.message}`);

    const { error: signInError } = await client.auth.verifyOtp({
      type: "email",
      token_hash: link.properties.hashed_token,
    });
    if (!signInError) break;

    const rateLimited = /rate limit/i.test(signInError.message);
    if (!rateLimited || attempt >= 30) {
      throw new Error(`${email} 로그인 실패: ${signInError.message}`);
    }
    console.log(`  (${nick} 로그인 속도 제한 — 20초 뒤 재시도)`);
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }

  // 경매를 열려면 배송지가 먼저 있어야 한다 (F12 3.4). 이미 있으면 그대로 쓴다
  let address = await withTransientRetry(
    () => client.from("addresses").select("id").eq("user_id", id).maybeSingle(),
    `${email} 배송지 조회`,
  );
  if (!address) {
    await withTransientRetry(
      () =>
        client.from("addresses").insert({
          user_id: id,
          recipient: nick,
          phone: "010-0000-0000",
          zipcode: "04524",
          address1: "서울특별시 중구 세종대로 110",
          address2: "1층",
        }),
      `${email} 배송지 등록`,
    );
    address = await withTransientRetry(
      () => client.from("addresses").select("id").eq("user_id", id).single(),
      `${email} 배송지 조회`,
    );
  }

  console.log(`  ${nick} (${email})`);
  return { id, nick, email, client, addressId: address.id };
}

/* --- 경매 --------------------------------------------------------------- */

async function seedAuction(spec, people) {
  const host = people.get(spec.host);
  console.log(`\n경매 "${spec.title}" — 주최자 ${host.nick}`);

  // 이전 실행이 만들어 뒀으면 그대로 쓰고 빠진 사연·입찰·공감만 채운다 (멱등)
  const existing = await withTransientRetry(
    () =>
      admin
        .from("auctions")
        .select("id")
        .eq("user_id", host.id)
        .eq("title", spec.title)
        .maybeSingle(),
    "경매 조회",
  );

  let auctionId;
  if (existing) {
    auctionId = existing.id;
    console.log("  이미 있음 — 빠진 것만 채웁니다");
  } else {
    // 이미지 경로가 경매 ID 를 포함하므로(§11.5 경로 규칙) ID 를 먼저 정하고 올린다.
    // 그래야 image_urls 에 임시값을 넣었다 고치는 중간 상태가 생기지 않는다
    auctionId = crypto.randomUUID();
    const imageUrls = await uploadImages(host.id, auctionId, spec.photos);
    const endAt = new Date(Date.now() + spec.hours * 3600_000).toISOString();

    await withTransientRetry(
      () =>
        host.client.from("auctions").insert({
          id: auctionId,
          user_id: host.id,
          address_id: host.addressId,
          title: spec.title,
          description: spec.description,
          image_urls: imageUrls,
          end_at: endAt,
        }),
      "경매 등록",
    );
  }

  const existingEpisodes =
    (await withTransientRetry(
      () =>
        admin
          .from("episodes")
          .select("id, user_id, bid_amount")
          .eq("auction_id", auctionId),
      "사연 조회",
    )) ?? [];
  const episodeByAuthor = new Map(existingEpisodes.map((e) => [e.user_id, e]));

  for (const episodeSpec of spec.episodes) {
    const author = people.get(episodeSpec.author);

    let episode = episodeByAuthor.get(author.id);
    if (!episode) {
      episode = await withTransientRetry(
        () =>
          author.client
            .from("episodes")
            .insert({
              auction_id: auctionId,
              user_id: author.id,
              title: episodeSpec.title,
              content: episodeSpec.content,
            })
            .select("id, bid_amount")
            .single(),
        "사연 등록",
      );
    }

    // 입찰은 place_bid() 로만 한다. 잔액·원장이 한 트랜잭션에서 함께 움직인다 (§4.1)
    if ((episode.bid_amount ?? 0) < episodeSpec.bid) {
      await withTransientRetry(
        () =>
          author.client.rpc("place_bid", {
            p_episode_id: episode.id,
            p_new_amount: episodeSpec.bid,
          }),
        "입찰",
      );
    }

    // 가중치는 서버가 정한다. 주최자면 50, 그 외는 10 (§4.4 · §11.2)
    // toggle 이라 두 번 부르면 풀리므로, 이미 눌린 공감은 건드리지 않는다
    const liked =
      (await withTransientRetry(
        () =>
          admin
            .from("episode_likes")
            .select("user_id")
            .eq("episode_id", episode.id),
        "공감 조회",
      )) ?? [];
    const likedIds = new Set(liked.map((row) => row.user_id));

    for (const likerKey of episodeSpec.likedBy) {
      const liker = people.get(likerKey);
      if (likedIds.has(liker.id)) continue;
      await withTransientRetry(
        () => liker.client.rpc("toggle_episode_like", { p_episode_id: episode.id }),
        "공감",
      );
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
    .eq("id", auctionId);

  // 크론(1분 주기)이 먼저 처리했으면 close_auction 은 그대로 돌려준다 (§9 중복 방지)
  const { data: closed, error: closeError } = await admin.rpc("close_auction", {
    p_auction_id: auctionId,
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
 * 사진들을 내려받아 공개 버킷에 `cover-1.jpg`, `cover-2.jpg`… 로 올린다.
 *
 * 사진은 Unsplash 직링크다. API 키가 없어도 되고, 주소는 `PHOTOS` 에 박아 두었다
 * (전부 `image/jpeg` 200 을 확인한 것들이다). 받아오지 못하면 **조용히 넘어가지
 * 않고 멈춘다** — 빈 이미지로 넘어가면 그걸 나중에 알아채기 어렵다.
 *
 * 같은 원본을 여러 경매가 쓰므로 다운로드는 URL 단위로 캐시한다.
 */
const downloadCache = new Map();

async function uploadImages(userId, auctionId, entries) {
  const urls = [];

  for (const [index, entry] of entries.entries()) {
    const source = photoUrl(entry);

    let bytes = downloadCache.get(source);
    if (!bytes) {
      bytes = await download(source, entry);
      downloadCache.set(source, bytes);
    }

    const path = `${userId}/${auctionId}/cover-${index + 1}.jpg`;
    await withTransientRetry(
      () =>
        admin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true }),
      `이미지 업로드 (${entry})`,
    );

    urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return urls;
}

/** 남의 서버에서 받는 일이라 한 번 삐끗할 수 있다. 세 번까지 다시 시도한다 */
async function download(source, label, attempts = 3) {
  let lastError;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (i < attempts) await new Promise((r) => setTimeout(r, 500 * i));
    }
  }

  throw new Error(`사진 "${label}" 을 받지 못했습니다: ${lastError.message}`);
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

  const emails = new Set(PEOPLE.map((p) => p.email));
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw new Error(`계정 조회 실패: ${listError.message}`);
  const ids = listed.users.filter((u) => emails.has(u.email)).map((u) => u.id);

  if (ids.length === 0) {
    console.log("  지울 것이 없습니다.");
    return;
  }

  const { data: auctions } = await admin
    .from("auctions")
    .select("id, user_id")
    .in("user_id", ids);

  for (const auction of auctions ?? []) {
    // 파일 이름을 나열하지 않고 폴더째 비운다 — 예전 시드의 cover.jpg/png 도 같이 걷힌다
    const prefix = `${auction.user_id}/${auction.id}`;
    const { data: files } = await admin.storage.from(BUCKET).list(prefix);
    if (files?.length) {
      await admin.storage
        .from(BUCKET)
        .remove(files.map((file) => `${prefix}/${file.name}`));
    }
  }

  await admin.from("auctions").delete().in("user_id", ids);
  await admin.from("addresses").delete().in("user_id", ids);

  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`계정 삭제 실패: ${error.message}`);
  }

  console.log(`  계정 ${ids.length}개와 그 데이터를 지웠습니다.`);
}

async function findAuthUserId(email) {
  // admin.listUsers 는 페이지 단위다. 시드 계정 수가 적으므로 첫 장이면 충분하다
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(`계정 조회 실패: ${error.message}`);
  return data.users.find((u) => u.email === email)?.id ?? null;
}

/* --- 도구 --------------------------------------------------------------- */

/**
 * supabase-js 는 네트워크가 삐끗하면 error 에 "fetch failed" 를 담아 돌려준다.
 * 그런 일시 오류만 몇 번 다시 시도하고, 나머지는 그대로 멈춘다.
 * 성공하면 data 를 돌려준다.
 */
async function withTransientRetry(run, label, attempts = 4) {
  let message;
  for (let i = 1; i <= attempts; i += 1) {
    const { data, error } = await run();
    if (!error) return data;
    message = error.message ?? String(error);
    const transient = /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket|network/i.test(
      message,
    );
    if (!transient) break;
    if (i < attempts) {
      console.log(`  (${label} 일시 오류 — ${1.5 * i}초 뒤 재시도)`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * i));
    }
  }
  throw new Error(`${label} 실패: ${message}`);
}

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
