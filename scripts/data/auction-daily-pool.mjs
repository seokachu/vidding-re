/**
 * 경매 자동 활성화 풀 — auction-daily.mjs 가 하루 1건씩 꺼내 올리는 새 품목.
 *
 * ## 풀이 다 올라가면?
 *
 * 실패하지 않는다. auction-daily.mjs 는 풀이 비면 **마감된 지 7일이 지난 경매를
 * 재등록**하므로(같은 물건이 몇 주 뒤 다른 목록으로 다시 올라오는 건 중고 장터에서
 * 자연스럽다) 자동화는 무한히 돈다. 이 풀은 그 순환에 "처음 보는 품목"을 섞는
 * 용도다 — 새 글이 고프면 여기에 이어붙이면 된다.
 *
 * ## 사진 규칙
 *
 * `PHOTOS` 의 Unsplash ID 는 전부 seed.mjs 에서 이미 200 을 확인한 것들이다.
 * 새 ID 를 추가할 때는 반드시 `photoUrl()` 이 만드는 주소를 브라우저로 열어
 * 이미지가 나오는지 확인할 것 — 크론이 다운로드에 실패하면 그 날 등록이 실패한다.
 *
 * 단, **seed 목록이 대표 사진(1번째 컷)으로 쓴 ID 를 새 품목의 대표 사진으로
 * 다시 쓰지 않는다.** 홈 목록에 같은 썸네일이 두 번 보이면 바로 티가 난다.
 * 그래서 아래는 seed 가 2·3번째 컷으로만 썼거나(`acoustic-playing` 등),
 * 이미 마감된 경매의 사진(`espresso-machine` 등)만 골랐다.
 *
 * ## 사연(episodes) 규칙
 *
 * - author 는 seed.mjs 의 PEOPLE 키. **host 본인은 사연을 못 쓴다** (RLS).
 * - bid 는 0·1000·1500·2000·2500·3000 만 허용된다 (episodes CHECK).
 * - 실행 시점에 author 의 잔액이 모자라면 스크립트가 잔액 있는 다른 계정으로
 *   대신 올린다. 사연은 전부 1인칭 일반 문체라 누가 올려도 어색하지 않다.
 */

export const PHOTOS = {
  // 마감된 seed 경매의 사진 — 홈에 더 이상 노출되지 않아 바로 재사용해도 된다
  "espresso-machine": "1627398621538-918a69017d28",
  "wooden-desk": "1714973148365-6db2ef41d7c7",
  "wooden-stool": "1773389061469-53969f48e7e2",

  // seed 가 2·3번째 컷으로만 쓴 사진 — 대표 컷으로는 처음 노출된다
  "dslr-lenses": "1516035069371-29a1b244cc32",
  "tea-cup": "1544787219-7f47ccb76574",
  succulent: "1485955900006-10f4d324d411",
  "acoustic-playing": "1510915361894-db8b60106cb1",
  "acoustic-guitar": "1654721355119-40e84bf6d951",
  "turntable-playing": "1603048588665-791ca8aea617",
  turntable: "1634650254521-b1596c5a2d37",
  "book-open": "1509021436665-8f07dbf5bf1d",
  "book-grass": "1476275466078-4007374efbbe",
  "wristwatch-b": "1434056886845-dac89ffe9b56",
  "travel-backpack-b": "1547949003-9792a18a2601",
  "keyboard-desk": "1498049794561-7780e7231661",
};

export const VARIANTS = {
  square: "&h=1080&crop=entropy",
  closeup: "&h=810&crop=focalpoint&fp-x=0.42&fp-y=0.45&fp-z=1.7",
};

/** "키" 또는 "키@square"·"키@closeup" 를 실제 URL 로 푼다 (seed.mjs 와 동일 규칙) */
export function photoUrl(entry) {
  const [key, variant] = entry.split("@");
  const id = PHOTOS[key];
  if (!id) throw new Error(`PHOTOS 에 "${key}" 가 없습니다.`);
  const extra = variant ? VARIANTS[variant] : "";
  if (variant && !extra) throw new Error(`변형 "${variant}" 는 없습니다.`);
  return `https://images.unsplash.com/photo-${id}?w=1080&q=80&fm=jpg&fit=crop${extra}`;
}

/* --- 풀 ------------------------------------------------------------------
 * 위에서부터 하루 1건씩 소진된다. 제목은 풀·seed 통틀어 겹치면 안 된다 —
 * 스크립트가 "이미 올라갔는가"를 제목으로 판정하기 때문이다.
 * ------------------------------------------------------------------------ */

export const DAILY_POOL = [
  {
    host: "yuna",
    title: "가정용 에스프레소 머신",
    description:
      "카페 장비를 새로 들이면서 집에서 쓰던 걸 내놓아요. 스팀 잘 나오고 물때 청소해 뒀습니다.",
    photos: ["espresso-machine@square", "espresso-machine@closeup"],
    hours: 168,
    episodes: [
      {
        author: "jihun",
        title: "탕비실에 커피를 들이고 싶어요",
        content:
          "사무실에 커피머신이 없어서 다들 밖에서 사 옵니다. 겨울엔 그 한 잔 사러 나가는 길이 꽤 멀어요. 구석에 두고 돌아가며 내려 마시고 싶습니다.",
        bid: 1500,
        likedBy: ["yuna"],
      },
      {
        author: "daeun",
        title: "공부하는 책상 옆에 두고 싶습니다",
        content:
          "도서관 대신 집에서 공부하는데, 카페 갈 돈을 아끼려다 보니 커피를 끊게 되더라고요. 아침에 한 잔 내려두면 하루가 좀 단단해질 것 같아요.",
        bid: 2000,
        likedBy: ["jihun"],
      },
    ],
  },
  {
    host: "roun",
    title: "원목 작업 테이블",
    description:
      "작업실을 정리하면서 내놓습니다. 폭이 넓어 도면 작업이나 재봉에 좋아요.",
    photos: ["wooden-desk@square", "wooden-desk@closeup"],
    hours: 168,
    episodes: [
      {
        author: "yerin",
        title: "재봉틀 자리를 넓히고 싶어요",
        content:
          "지금 쓰는 테이블이 좁아 원단을 늘어놓을 데가 없습니다. 폭이 넓은 상판이면 재단까지 한자리에서 끝낼 수 있어요.",
        bid: 1500,
        likedBy: ["roun"],
      },
      {
        author: "minseo",
        title: "동생과 나란히 앉을 책상이 필요합니다",
        content:
          "방 하나를 둘이 쓰는데 책상은 하나뿐이에요. 긴 테이블을 벽에 붙이면 둘이 나란히 앉을 수 있을 것 같습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    // 48시간짜리 하나 — 등록 다음 날 '마감 임박' 배지가 자연스럽게 켜진다
    host: "eunwoo",
    title: "원목 스툴",
    description: "현관에서 신발 신을 때 쓰던 스툴입니다. 흔들림 없이 튼튼해요.",
    photos: ["wooden-stool@closeup", "wooden-stool"],
    hours: 48,
    episodes: [
      {
        author: "sohee",
        title: "아이 세면대 발판이 필요해요",
        content:
          "아이가 세면대에 손이 안 닿아 매번 안아 올립니다. 딛고 올라설 튼튼한 것이면 충분해요.",
        bid: 1000,
        likedBy: ["eunwoo"],
      },
    ],
  },
  {
    host: "hajun",
    title: "카메라 렌즈 2개",
    description:
      "바디를 바꾸면서 마운트가 안 맞게 된 렌즈 둘입니다. 곰팡이 없이 보관했어요.",
    photos: ["dslr-lenses", "dslr-lenses@closeup"],
    hours: 168,
    episodes: [
      {
        author: "jia",
        title: "동아리 과제전에 단렌즈가 필요해요",
        content:
          "몸체는 겨우 장만했는데 번들 렌즈 하나로 버티고 있습니다. 과제전 주제가 인물이라 밝은 렌즈가 간절해요.",
        bid: 2000,
        likedBy: ["hajun", "gunwoo"],
      },
      {
        author: "seowoo",
        title: "아이 공연을 멀리서 찍어야 합니다",
        content:
          "강당 뒤편 학부모석에서는 아이 얼굴이 점으로 나와요. 당겨 찍을 렌즈가 있으면 올해는 표정까지 남길 수 있을 것 같습니다.",
        bid: 1500,
        likedBy: [],
      },
      {
        author: "dohyun",
        title: "빌려 쓰는 게 미안해져서요",
        content:
          "출사 모임에서 매번 옆 사람 렌즈를 빌립니다. 제 것이 생기면 마음 편히 오래 찍을 수 있을 것 같아요.",
        bid: 1000,
        likedBy: ["jia"],
      },
    ],
  },
  {
    host: "siyeon",
    title: "홍차잔 세트",
    description:
      "찬장에서 자리만 차지해 내놓습니다. 잔 둘에 받침 둘, 이 빠진 곳 없어요.",
    photos: ["tea-cup", "tea-cup@closeup"],
    hours: 168,
    episodes: [
      {
        author: "jiwoo",
        title: "차 모임 손님상에 올리고 싶어요",
        content:
          "머그잔에 홍차를 내다 보면 어쩐지 미안해집니다. 받침까지 갖춘 잔이면 모임이 한결 격식 있어질 거예요.",
        bid: 1000,
        likedBy: ["siyeon"],
      },
      {
        author: "yuna",
        title: "새 메뉴에 쓸 잔을 찾습니다",
        content:
          "카페에서 밀크티를 새로 내놓는데 잔이 마땅치 않았어요. 손님 앞에 놓이는 잔 하나가 메뉴의 절반이더라고요.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "jiho",
    title: "다육이 화분 셋",
    description: "번식이 잘돼 세 개가 됐습니다. 화분째 드려요.",
    photos: ["succulent", "succulent@closeup"],
    hours: 168,
    episodes: [
      {
        author: "eunseo",
        title: "아이 책상에 하나 놓아주고 싶어요",
        content:
          "학교에서 식물 관찰 숙제를 받아 왔습니다. 매일 들여다볼 것이 생기면 아침 습관도 같이 잡힐 것 같아요.",
        bid: 1000,
        likedBy: ["jiho"],
      },
      {
        author: "seojin",
        title: "교무실 창가가 허전합니다",
        content:
          "학교 창가에 초록이 하나도 없어요. 물을 자주 안 줘도 되는 아이들이라면 방학에도 버텨줄 것 같습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "minjun",
    title: "통기타",
    description: "장롱 위에서 몇 해 잔 기타입니다. 줄만 갈면 바로 칠 수 있어요.",
    photos: ["acoustic-playing", "acoustic-guitar@closeup"],
    hours: 168,
    episodes: [
      {
        author: "roun",
        title: "글이 막힐 때 칠 악기가 필요해요",
        content:
          "소설이 막히면 산책 말고는 할 게 없습니다. 코드 몇 개라도 잡고 있으면 머리가 풀릴 것 같아요.",
        bid: 1000,
        likedBy: ["minjun"],
      },
      {
        author: "ayun",
        title: "교생 실습에서 아이들과 부르려고요",
        content:
          "종례 때 노래 한 곡 같이 부르는 반을 만들고 싶습니다. 반주가 있으면 아이들이 더 크게 불러줄 거예요.",
        bid: 1500,
        likedBy: ["roun"],
      },
    ],
  },
  {
    host: "gunwoo",
    title: "LP 턴테이블",
    description: "작업실 장비를 줄이면서 내놓습니다. 벨트는 새것으로 갈아뒀어요.",
    photos: ["turntable-playing", "turntable@square"],
    hours: 168,
    episodes: [
      {
        author: "arin",
        title: "엄마의 LP 를 틀어드리고 싶어요",
        content:
          "친정 다락에서 엄마 처녀 적 판들이 나왔습니다. 노래 제목을 읽어드렸더니 눈이 반짝하시더라고요. 소리로 들려드리고 싶습니다.",
        bid: 2000,
        likedBy: ["gunwoo", "sua"],
      },
      {
        author: "hyunwoo",
        title: "작은 도서관에 음악을 놓고 싶습니다",
        content:
          "책만 있는 공간이 조금 조용해요. 주말 오후에 판 한 장 돌아가면 머무는 분들이 늘 것 같습니다.",
        bid: 1500,
        likedBy: [],
      },
    ],
  },
  {
    host: "arin",
    title: "에세이 열다섯 권",
    description:
      "책장을 줄이면서 고른 에세이들입니다. 밑줄 없는 것만 담았어요.",
    photos: ["book-open", "book-grass"],
    hours: 168,
    episodes: [
      {
        author: "daeun",
        title: "야간 근무 휴게실에 두고 싶어요",
        content:
          "새벽 휴게 시간에 다들 휴대폰만 봅니다. 짧게 한 꼭지씩 읽을 책이면 눈이 덜 피곤할 거예요.",
        bid: 1000,
        likedBy: ["arin"],
      },
      {
        author: "chaewon",
        title: "잠들기 전 읽을거리를 찾습니다",
        content:
          "휴대폰 대신 종이를 들기로 했어요. 에세이면 어디서 덮어도 부담이 없어 좋습니다.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "dohyun",
    title: "메탈 손목시계",
    description:
      "선물 받고 몇 번 못 찬 메탈 시계입니다. 줄 조절 공구 같이 드려요.",
    photos: ["wristwatch-b", "wristwatch-b@closeup"],
    hours: 168,
    episodes: [
      {
        author: "gunwoo",
        title: "첫 출근하는 동생에게 주고 싶습니다",
        content:
          "동생이 다음 달 첫 출근을 합니다. 손목에 뭐라도 채워 보내고 싶은 형 마음이에요.",
        bid: 1500,
        likedBy: ["dohyun"],
      },
      {
        author: "siwoo",
        title: "공방에선 휴대폰을 못 꺼내요",
        content:
          "톱밥 때문에 주머니에서 휴대폰 꺼내기가 조심스럽습니다. 손목시계면 작업 중에도 흘끗 볼 수 있어요.",
        bid: 1000,
        likedBy: [],
      },
    ],
  },
  {
    host: "seojin",
    title: "여행 배낭 45L",
    description: "배낭여행 시절 쓰던 45리터입니다. 지퍼 다 잘 잠겨요.",
    photos: ["travel-backpack-b", "travel-backpack-b@closeup"],
    hours: 168,
    episodes: [
      {
        author: "taeyang",
        title: "본가 다녀올 때마다 짐과 씨름합니다",
        content:
          "명절마다 반찬이며 김치며 양손 가득 들고 옵니다. 등에 지면 두 손이 자유로워질 거예요.",
        bid: 1000,
        likedBy: ["seojin"],
      },
      {
        author: "haeun",
        title: "스케치 도구를 지고 다니려고요",
        content:
          "야외 스케치를 다니는데 이젤에 물감까지 들면 가방이 모자랍니다. 큰 배낭이면 한 번에 나설 수 있어요.",
        bid: 1500,
        likedBy: ["taeyang"],
      },
    ],
  },
  {
    host: "jiwoo",
    title: "무선 키보드·마우스 세트",
    description:
      "노트북 거치대를 쓰게 되면서 세트로 내놓습니다. 건전지형이라 편해요.",
    photos: ["keyboard-desk", "keyboard-desk@closeup"],
    hours: 168,
    episodes: [
      {
        author: "minseo",
        title: "자습실 자세를 고치고 싶어요",
        content:
          "노트북을 눈높이에 올리고 나니 이번엔 손이 문제네요. 세트로 두면 목도 손목도 살 것 같습니다.",
        bid: 1000,
        likedBy: ["jiwoo"],
      },
    ],
  },
];
