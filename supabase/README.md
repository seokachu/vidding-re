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
| `20260731000009_ending_soon_steps.sql` | 마감 임박을 기간 비례 3단계로 (08 을 대체) |
| `20260731000010_ending_soon_skip_late_joiners.sql` | 단계를 지난 뒤 참여한 사람 제외 |
| `20260801000001_fix_chat_rooms_select_policy.sql` | `chat_rooms` SELECT 정책의 컬럼 참조 수정 |
| `20260802000001_address_optional.sql` | `auctions.address_id` nullable · `on delete set null` · 생성 정책에서 배송지 조건 제거 (F1 3.2 개정) |
| `20260802000002_message_kind.sql` | `messages.kind` (`TEXT` / `ADDRESS`) — 배송 정보 카드 (F6 3.6) |

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

### 10. 배송지는 경매의 요건이 아니다 (`20260802000001` 에서 뒤집음)

**처음에는** `auctions.address_id` 가 NOT NULL FK 였고, 마감된 경매도 발송지
스냅샷으로 그 행을 참조해서 **경매를 한 번이라도 연 배송지는 삭제할 수 없었다.**
"명세보다 DB 가 엄격한" 지점으로 적어 두고 그대로 뒀던 부분이다.

그 전제 자체가 틀렸다는 것이 나중에 드러났다 (F1 3.2 개정).

- 그 값을 **읽는 화면이 하나도 없었다.** 유일한 소비자가 삭제를 막는 이 FK 였다
- 받아둔 것은 **주최자 본인의 주소**다. 택배에 필요한 것은 낙찰자의 주소인데 어디에서도 받지 않는다
- 택배냐 직거래냐는 낙찰 뒤 **채팅에서 정한다** (F6 2). 직거래면 주소가 아예 필요 없다

그래서 `20260802000001_address_optional.sql` 로 뒤집었다.

| 항목 | 전 | 후 |
|---|---|---|
| `auctions.address_id` | `not null` | **nullable** (발송지 스냅샷, 선택) |
| FK 삭제 동작 | 기본 `no action` → 삭제 차단 | **`on delete set null`** |
| `auctions_insert_owner` | 본인 배송지 보유를 `exists` 로 강제 | `address_id is null or exists(...)` — **값이 있을 때만** 소유 검사 |

**계정 삭제를 막던 사슬도 같이 끊겼다.** 배송지가 지워지면 경매의 참조만
`null` 이 되므로 `auth.users` 삭제가 이 FK 때문에 막히지는 않는다.
계정 삭제 자체는 여전히 이번 범위 밖이다 (F 스펙 없음).

### 11. 마감 임박 알림은 기간에 비례한 3단계다

**단계가 곧 `type` 이다.** 단일 `AUCTION_ENDING_SOON` 으로는
(사용자, 종류, 경매)당 1건 제한 때문에 단계마다 보낼 수 없다.

```
AUCTION_ENDING_SOON_3D · AUCTION_ENDING_SOON_1D · AUCTION_ENDING_SOON_1H
```

| 등록 기간 | 3일 전 | 1일 전 | 1시간 전 |
|---|:---:|:---:|:---:|
| 7일 | O | O | O |
| 3일 | - | O | O |
| 1일 | - | - | O |

**경매마다 분기하지 않는다.** 위 표는 조건 하나에서 나온다.

```sql
end_at - created_at > 단계     -- 경매 기간보다 짧은 단계만 보낸다
```

3일 경매에 '3일 전' 단계를 허용하면 **등록되는 순간 발송된다.**
08 에서 단일 3시간 창으로 겪은 문제와 같은 성질이다.

**단계를 지난 뒤 참여한 사람에게는 그 단계를 보내지 않는다** (10).

```sql
episodes.created_at < end_at - 단계
```

마감 임박 알림은 잊고 있을 수 있는 사람을 깨우는 것이다 (F9 2).
방금 사연을 쓴 사람은 이미 안다. 알림이 아니라 소음이고,
30분 남았는데 "1시간 전"이라고 알리면 **문구도 사실과 다르다.**

> 09 의 '가장 급한 단계만' 규칙만으로는 부족했다. 그 규칙은 여러 단계 중
> 하나를 고를 뿐, **애초에 보내지 말아야 할 사람**을 걸러내지 못한다.

**한 번에 한 단계만 보낸다** (09). 정상 운영에서는 단계마다 크론이 먼저 처리하므로
겹치지 않지만, 크론이 며칠 멈췄다 재개하면 한 사람이 세 단계를 동시에 만족한다.
그때 "3일 전이에요"를 30분 전에 보내지 않도록 `CASE` 로 **가장 급한 단계 하나만**
고른다 (1시간 → 1일 → 3일 순으로 검사).

> **크론은 5분 주기다.** 가장 급한 단계가 1시간이고, 1일 등록 경매는 그 단계 하나만
> 받으므로 도착 시각이 중요하다. 10분 주기면 오차가 최대 10분이다.

> 창은 순간이 아니라 누적이다 (`end_at <= now() + 단계`). 한 번 참이 되면 마감까지
> 계속 참이므로 **크론이 한 틱을 걸러도 알림을 놓치지 않는다.** 중복은 인덱스가 막는다.

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
| Google · Kakao 제공자 | **Enabled — 실제 로그인 성공 확인 (2026-07-31)** |

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

### Kakao 앱 설정 — 완료된 상태

앱 `vidding-re` (ID `1529829`), **비즈 앱**(개인 개발자)이라 이메일을 필수 동의로 받을 수 있다.

| 동의항목 | ID | 상태 |
|---|---|---|
| 닉네임 | `profile_nickname` | 필수 동의 |
| 프로필 사진 | `profile_image` | 필수 동의 |
| 카카오계정(이메일) | `account_email` | **필수 동의 [수집]** |

이메일을 **필수 동의**로 둔 이유가 아래다. 선택 동의면 사용자가 체크를 풀 수 있고,
그러면 가입이 막힌다. 비즈 앱이라 필수로 걸 수 있었다.

### 이메일이 없으면 가입을 중단한다

F10 4 는 "이메일 정보 없음 → **가입을 중단**하고 이메일 제공에 동의가 필요함을 안내한다"고 정한다.
`handle_new_user()` 는 `new.email` 이 비어 있으면 `EMAIL_REQUIRED` 예외를 던져 **가입 자체를 실패시킨다.**

> 초기 구현은 `<uuid>@no-email.local` 로 채워 계정을 만들고 가입 보너스 5,000 P 까지 지급했다.
> 연락 불가능한 계정이 원장에 남으므로 `20260731000007` 에서 바로잡았다.

로그인 콜백에서 `EMAIL_REQUIRED` 로 실패하면 "이메일 제공에 동의해야 가입할 수 있어요"를 안내한다.

> 로그인 요청에는 `account_email profile_nickname profile_image` 스코프를 포함한다 (위 코드 참고).

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
