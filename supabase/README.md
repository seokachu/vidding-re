# Supabase 스키마

기준 문서: [`docs/데이터-모델-명세.md`](../docs/데이터-모델-명세.md)

프로젝트 `vtkeruqexphuvritwkyt` (vidding-re) 에 **적용 완료**했다. 마이그레이션은 아래 순서대로 실행한다.

| 파일 | 내용 |
|---|---|
| `20260731000001_schema.sql` | 테이블 10개 · 제약 · 인덱스 (§3, §8) |
| `20260731000002_views.sql` | `v_episode_scores` · `v_auction_summary` · `v_user_profiles` (§5) |
| `20260731000003_rls.sql` | 관계 판정 헬퍼 · RLS 정책 27개 · 컬럼 단위 GRANT (§6) |
| `20260731000004_functions.sql` | RPC 4개 · 서버 전용 함수 3개 · 트리거 5개 (§4, §10) |
| `20260731000005_storage_realtime.sql` | `auction-images` 버킷 · Realtime 발행 (§11.5) |
| `20260731000006_cron.sql` | `pg_cron` 작업 2개 (§9, §11.3, §11.6) |
| `20260731000007_auth_email_required.sql` | 이메일 없는 계정 가입 중단 (F10 4) |
| `20260731000008_ending_soon_window.sql` | 마감 임박 기준 24시간 → 3시간 (§11.3 개정) |

> **이미 적용된 마이그레이션은 고치지 않는다.** 바뀐 내용은 새 파일로 덧붙인다.
> 기존 DB 는 이미 실행한 파일을 다시 읽지 않으므로, 파일을 고치면
> **새로 만든 DB 와 기존 DB 가 갈라진다.** 07·08 이 그래서 별도 파일이다.

---

## 명세를 코드로 옮기며 내린 결정

명세가 정하지 않았거나 문서끼리 어긋난 지점이다. **바꾸려면 명세를 먼저 고친다.**

### 1. `users` 조회 범위와 공개 프로필

명세 §6 의 권한 표에 `users` 가 없다. 하지만 이 테이블에는 이메일과 잔액이 들어 있고,
F3 3.6 은 "마스킹된 이메일조차 노출할 이유가 없다"고 못 박는다.

- `users` SELECT → **본인 행만**
- 사연 목록 등에 필요한 닉네임·아바타는 `v_user_profiles` 뷰로 분리해 공개

### 2. 컬럼 단위 GRANT

RLS 정책은 "어느 **행**"만 막는다. 정책만으로는 작성자가 자기 사연의
`bid_amount` 를 3,000 으로 직접 UPDATE 하는 것을 막을 수 없다. 그래서
쓰기 가능한 컬럼을 GRANT 로 좁혔다.

| 테이블 | 클라이언트가 쓸 수 있는 컬럼 |
|---|---|
| `users` | `nick_name`, `avatar_url` — 잔액은 RPC 로만 |
| `auctions` | `title`, `description`, `image_urls`, `end_at`, `address_id` — 상태·낙찰은 RPC 로만 |
| `episodes` | `title`, `content` — `bid_amount` 는 `place_bid()` 로만 |
| `notifications` | `read_at` 만 |

### 3. `episodes` DELETE 정책이 없다

직접 DELETE 를 허용하면 반환 처리(§4.3)를 건너뛰고 포인트가 사라진다.
삭제는 `delete_episode()` RPC 하나로만 가능하다.

### 4. 경매 수정·삭제 조건 분리

명세 §6 표는 `auctions` 의 수정·삭제를 한 칸에 묶고 "`user_id = auth.uid()` AND 사연 0건"이라고 적었다.
그런데 F1 3.5 는 수정을 "소유 여부만으로 판단한다"고 하고, 사연 0건 조건은 F1 3.6 의 **삭제** 규칙이다.

- 수정 → 주최자 + `status = 'OPEN'` (F1 3.5 · 4.1)
- 삭제 → 주최자 + 사연 0건 (F1 3.6)

### 5. `points` 의 FK 는 `ON DELETE SET NULL`

원장은 append-only(P4)지만, 사연 삭제(§4.3)와 경매 삭제(F1 3.6)는 허용된다.
FK 를 그대로 두면 삭제가 막히므로 참조만 끊는다. **금액·종류·잔액은 손대지 않는다.**

### 6. `notifications` 의 대상 FK 도 `SET NULL`

F9 4 가 "알림 클릭 시 대상이 삭제됨 → 안내 후 목록에 머무른다"를 요구한다.
대상이 지워져도 알림 자체는 남아야 한다.

### 7. 메시지 읽음 처리는 RPC

§6 은 `messages` 수정 권한을 `sender_id = auth.uid()` 로 정했는데,
F6 3.4 의 읽음 처리는 **수신자**가 한다. 정책을 넓히는 대신
`mark_messages_read(chat_room_id)` 를 두어 참여자만 `read_at` 을 갱신하게 했다.

### 8. 알림 생성은 서버만

`notifications` 에 INSERT 정책이 없다. 생성 경로는 세 개다.

- `EPISODE_CREATED` — `episodes` INSERT 트리거
- `CHAT_MESSAGE` — `messages` INSERT 트리거
- `AUCTION_RESULT` · `AUCTION_ENDING_SOON` — `close_auction()` · `notify_ending_soon()`

### 9. 동점 3차 기준

`ORDER BY total_score DESC, created_at ASC, episode_id ASC`.
F5 4 의 "작성 시각까지 동일하면 사연 식별자 기준으로 결정론적으로" 를 정렬 하나로 표현했다.

### 10. 배송지 삭제는 FK 가 막는다 (명세보다 엄격)

F12 3.5 는 "**진행 중인** 경매에 사용 중이면 차단"이지만,
`auctions.address_id` 는 NOT NULL FK 이고 마감된 경매도 **발송지 스냅샷**으로 그 행을 참조한다.
그래서 실제로는 **경매를 한 번이라도 연 배송지는 삭제할 수 없다.**

- 삭제 시도 → `23503 foreign_key_violation` → 앱에서 "진행 중인 경매에 사용 중인 배송지입니다"로 안내
- **수정은 언제나 가능**하므로 사용자가 막히는 흐름은 아니다
- 완료 조건 6("사용 중인 배송지 삭제가 차단된다")은 충족한다

같은 이유로 **경매를 연 적 있는 계정은 `auth.users` 삭제도 막힌다.**
계정 삭제는 이번 범위에 없다 (F 스펙 없음). 필요해지면 배송지를 경매에 **값으로 복사**하는 쪽으로 바꾼다.

### 11. 마감 임박 알림은 1회 — 확정

명세 §11.3 · F9 3.1 은 원래 "24시간 전 · 3시간 전 2회"였고,
§3.10 · F9 3.3 의 유니크 인덱스는 (사용자, 종류, 경매)당 1건으로 제한했다. 서로 어긋났다.

**1회로 확정**하고 명세를 고쳤다. 스키마는 바꾸지 않았다.

```
UNIQUE (user_id, type, auction_id) WHERE type IN ('AUCTION_ENDING_SOON','AUCTION_RESULT')
```

`notify_ending_soon()` 은 10분마다 돌지만 이 인덱스가 중복을 막는다.
**반복 실행이 곧 재시도이고, 알림은 마감 3시간 이내에 진입한 시점 한 번만 간다.**

> **임박 기준은 3시간이다** (§11.3). 기간 선택지가 1·3·7일로 바뀌면서, 24시간 기준으로는
> 1일(24시간) 경매가 등록되는 순간 임박 상태가 되고 알림도 즉시 나가는 문제가 있었다.
> 크론이 10분 주기이므로 3시간 창을 놓칠 일은 없다.

---

## 검증 결과

스모크 테스트를 트랜잭션 안에서 돌리고 롤백했다 (데이터는 남지 않았다).

```
주최자 1명 + 참여자 2명, 각 5,000 P 로 시작
b1 → 2,000 P 입찰 + 주최자 공감(+50)   → 2,050
b2 → 3,000 P 입찰 + b1 공감(+10)       → 3,010  ← 낙찰
```

| 항목 | 결과 |
|---|---|
| 낙찰 사연 | `e2` (3,010 > 2,050) |
| 공감 가중치 | 주최자 50 / 그 외 10 정확히 반영 |
| 잔액 | 주최자 8,000 · b1 5,000 · b2 2,000 |
| **포인트 총량** | **15,000 유지 (생성·소멸 없음)** |
| 원장 | `BID -2000`, `BID -3000`, `BID_REFUND_LOST 2000`, `WIN_TRANSFER 3000` |
| 채팅방 | 1개 생성 |
| 알림 | 5건 (새 사연 2 + 낙찰 결과 3) |
| RLS — 주최자의 자기 경매 사연 작성 | 차단됨 |
| RLS — 자기 사연 공감 | 차단됨 |

권한 우회도 직접 시도해 전부 막히는 것을 확인했다.

| 시도 | 결과 |
|---|---|
| 참여자가 `episodes.bid_amount` 를 직접 3,000 으로 UPDATE | 차단 |
| 본인 `users.point_balance` 를 직접 999,999 로 UPDATE | 차단 |
| 사연을 직접 DELETE (반환 우회) | 차단 |
| `points` 에 직접 적립 행 INSERT | 차단 |
| 주최자가 경매를 직접 `CLOSED` + 낙찰자 지정 | 차단 |
| 남의 알림 조회 | 안 보임 |
| 남의 이메일 조회 | 안 보임 |
| 공개 프로필(`v_user_profiles`) 조회 | 보임 (의도한 동작) |

`pg_cron` 은 1분마다 `close_due_auctions()` 를 실행하며 `cron.job_run_details` 에서 `succeeded` 로 확인했다.

---

## 인증 (F10)

### 대시보드 설정 현황

| 항목 | 상태 |
|---|---|
| Site URL | `https://vidding-re.vercel.app` |
| Redirect URLs | 3개 (아래) |
| Google · Kakao 제공자 | **아직 Disabled** — Client ID/Secret 입력 필요 |

```
http://localhost:3000/**
https://vidding-re.vercel.app/**                              ← 프로덕션
https://vidding-*-seoyoungs-projects-aabd6a70.vercel.app/**   ← 프리뷰
```

> 프리뷰 호스트는 `vidding-<해시>-<팀슬러그>.vercel.app` 형태다.
> 프로젝트 이름이 `vidding-re` 인데 호스트 접두어는 `vidding` 으로 잘린다.
> 처음에 `vidding-re-*-seokachu` 로 잘못 등록했다가 실제 배포 후 바로잡았다.

**Site URL 은 프로덕션을 가리킨다.** `redirectTo` 를 지정하지 않은 요청의 기본 도착지이므로,
`localhost` 로 두면 실제 사용자가 로그인 후 로컬로 튕긴다. 그래서 미리 프로덕션으로 맞춰뒀다.

그 대가로 **로컬 개발에서는 `redirectTo` 를 반드시 넘겨야 한다.** 넘기지 않으면
로그인 후 프로덕션으로 이동한다. `localhost:3000` 은 허용 목록에 있으므로 명시만 하면 된다.

```ts
supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: `${location.origin}/auth/callback`,   // 로컬·프리뷰·프로덕션 모두 이걸로 해결된다
    scopes: 'account_email profile_nickname profile_image',
  },
})
```

### 제공자를 켤 때 필요한 것

콘솔에 등록할 콜백 URL은 **하나**다. 제공자 화면에 표시되는 값과 같다.

```
https://vtkeruqexphuvritwkyt.supabase.co/auth/v1/callback
```

- **Google** — Cloud Console → 사용자 인증 정보 → 승인된 리디렉션 URI 에 위 URL 등록
- **Kakao** — Kakao Developers → 카카오 로그인 → Redirect URI 에 위 URL 등록

### Kakao 는 이메일이 선택 동의다 — 중요

F10 4 는 "이메일 정보 없음 → **가입을 중단**하고 이메일 제공에 동의가 필요함을 안내한다"고 정한다.
`handle_new_user()` 는 `new.email` 이 비어 있으면 `EMAIL_REQUIRED` 예외를 던져 **가입 자체를 실패시킨다.**

> 초기 구현은 `<uuid>@no-email.local` 로 채워 계정을 만들고 가입 보너스 5,000 P 까지 지급했다.
> 연락 불가능한 계정이 원장에 남으므로 `20260731000007` 에서 바로잡았다.

앱에서 해야 할 일이 두 가지다.

1. Kakao 로그인 요청에 **`account_email` 스코프**를 포함한다
2. Kakao Developers → 동의 항목에서 **카카오계정(이메일)** 을 활성화한다
   (필수 동의로 받으려면 비즈니스 앱 전환이 필요하다)

로그인 콜백에서 `EMAIL_REQUIRED` 로 실패하면 "이메일 제공에 동의해야 가입할 수 있어요"를 안내한다.

### 닉네임·아바타 매핑

제공자마다 키가 달라 순서대로 찾는다.

```
닉네임   nick_name → full_name → name → preferred_username → user_name → 이메일 아이디 → '이름없음'
아바타   avatar_url → picture → NULL
```

---

## 로컬에서 다시 적용하려면

```bash
supabase link --project-ref vtkeruqexphuvritwkyt
supabase db push
```

`pg_cron` 은 확장 설치가 먼저 필요하다 (`20260731000006_cron.sql` 이 `create extension` 을 포함한다).
