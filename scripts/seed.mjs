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
 * ## 돌리기 전에 — 이메일 제공자를 켜야 한다
 *
 * 위의 "그 사용자로 로그인" 이 **이메일＋비밀번호 로그인**이다. 그런데 서비스는
 * 소셜 둘만 제공하므로 (F10 3.1) 평소 이메일 제공자는 꺼 두고 산다.
 * 꺼진 채로 돌리면 첫 계정에서 `Email logins are disabled` 로 멈춘다.
 *
 *   1. Supabase 대시보드 → Authentication → Sign In / Providers → Email → 켜기
 *   2. `pnpm seed --clean`
 *   3. 다시 끄기 (`/auth/v1/settings` 의 `email` 이 `false` 인지 확인)
 *
 * 서비스 요구사항과 시드 방식이 부딪히는 지점이라 없앨 수는 없다. RPC 가
 * `auth.uid()` 로 판정하므로 service_role 로는 대신 부를 수 없기 때문이다.
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
 * 경매의 `photo` 가 이 표의 키를 가리킨다.
 * ---------------------------------------------------------------------- */

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?w=1080&q=80&fm=jpg&fit=crop`;

const PHOTOS = {
  "film-camera": UNSPLASH("1532800181046-044ce9bfd577"), // Jakob Owens
  "camping-chair": UNSPLASH("1516659583110-c59d8926c33a"), // Tim Foster
  "espresso-machine": UNSPLASH("1627398621538-918a69017d28"), // Aaron Doucett
  "wooden-stool": UNSPLASH("1773389061469-53969f48e7e2"), // Silver Ringvee
  "wooden-desk": UNSPLASH("1714973148365-6db2ef41d7c7"), // Jakub Żerdzicki
  "vintage-bicycle": UNSPLASH("1765798811107-3e6948d50dc5"), // Wolfgang Vrede
  turntable: UNSPLASH("1634650254521-b1596c5a2d37"), // Andres Valdes
  "acoustic-guitar": UNSPLASH("1654721355119-40e84bf6d951"), // Alicia Christin Gerald
  "hiking-backpack": UNSPLASH("1609865898563-93d63b3daa64"), // Ali Kazal
  "electric-kettle": UNSPLASH("1615634376875-f8999ce75a25"), // Margaret Jaszowska
  "pet-carrier": UNSPLASH("1635094544840-dbcd03874f06"), // Jose Antonio Gallego Vázquez
  "baby-stroller": UNSPLASH("1663579168345-8e955020f8ef"), // lucas Favre
  bookshelf: UNSPLASH("1524401597352-ec4463663233"), // James
  "area-rug": UNSPLASH("1600166931532-604e927c794b"), // Erfan Banaei
  "potted-plant": UNSPLASH("1596388454571-8dd77023e9fa"), // Nguyen Dang Hoang Nhu
  "camping-tent": UNSPLASH("1602079108581-4c5071154299"), // Suhyeon Choi
  "floor-lamp": UNSPLASH("1738355120576-50093baa24a6"), // Alexander K
  "board-game": UNSPLASH("1596687909057-dfac2b25b891"), // Shaurya Sagar
  "yoga-mat": UNSPLASH("1599447472329-449d9e262420"), // Alex Shaw
  "coffee-grinder": UNSPLASH("1778297308133-fc55ba28e4a1"), // Marin huang
};

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
].map((p) => ({ ...p, email: `seed-${p.key}@vidding.test` }));

/* --- 경매 --------------------------------------------------------------
 * `closeAfter: true` 면 사연·입찰·공감을 다 채운 뒤 마감 시각을 과거로 당기고
 * close_auction() 을 부른다. 낙찰·유찰·채팅방·알림이 전부 실제 경로로 생긴다.
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
    photo: "espresso-machine",
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
    photo: "wooden-stool",
    hours: 12,
    closeAfter: true,
    episodes: [], // 사연 0건 → 유찰 (F5)
  },
  {
    host: "haeun",
    title: "원목 책상",
    description: "이사하면서 자리가 없어졌어요. 상판이 넓어 작업하기 좋습니다.",
    photo: "wooden-desk",
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
    photo: "film-camera",
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
    photo: "camping-chair",
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
    photo: "vintage-bicycle",
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
    photo: "turntable",
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
    photo: "acoustic-guitar",
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
    photo: "hiking-backpack",
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
    photo: "electric-kettle",
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
    photo: "pet-carrier",
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
    photo: "baby-stroller",
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
    photo: "bookshelf",
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
    photo: "area-rug",
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
    photo: "potted-plant",
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
    photo: "camping-tent",
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
    photo: "floor-lamp",
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
    photo: "board-game",
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
    photo: "yoga-mat",
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
    photo: "coffee-grinder",
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
  const imageUrl = await uploadCover(host.id, auctionId, spec.photo);

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
 * 표지 사진을 내려받아 공개 버킷에 올린다.
 *
 * 예전에는 단색 PNG 를 만들어 올렸다. 의존성 없이 되긴 했지만 **목록이 색종이처럼
 * 보여서** 시안과 나란히 두면 서비스 쪽이 비어 보였다. 지금은 실제 사진을 쓴다.
 *
 * 사진은 Unsplash 직링크다. API 키가 없어도 되고, 주소는 `PHOTOS` 에 박아 두었다
 * (전부 `image/jpeg` 200 을 확인한 것들이다). 받아오지 못하면 **조용히 넘어가지 않고
 * 멈춘다** — 단색으로 되돌아가면 이 변경이 무의미해지고, 그걸 나중에 알아채기 어렵다.
 */
async function uploadCover(userId, auctionId, photoKey) {
  const source = PHOTOS[photoKey];
  if (!source) throw new Error(`PHOTOS 에 "${photoKey}" 가 없습니다.`);

  const bytes = await download(source, photoKey);
  const path = `${userId}/${auctionId}/cover.jpg`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);

  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
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
      // png 는 단색 표지를 쓰던 시절 것이다. 옛 시드도 같이 걷어낸다
      .remove([
        `${auction.user_id}/${auction.id}/cover.jpg`,
        `${auction.user_id}/${auction.id}/cover.png`,
      ]);
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
