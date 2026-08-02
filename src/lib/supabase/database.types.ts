/**
 * Supabase 스키마 타입.
 *
 * 기준: `supabase/migrations/*.sql` (적용 완료된 10개 파일)
 *
 * ⚠️ 이 파일은 **손으로 옮긴 것**이다. Supabase CLI 가 로컬에 없어
 * `supabase gen types` 를 돌리지 못했다. CLI 를 설치한 뒤에는
 *
 *     pnpm db:types
 *
 * 로 다시 뽑을 수 있다. 다만 CLI 는 CHECK 제약이 걸린 `text` 컬럼을
 * 전부 `string` 으로 내보낸다. 아래 `status` · `type` 처럼 값이 정해진
 * 컬럼은 리터럴 유니온으로 좁혀 두었으므로, 재생성했다면 그 부분을
 * 다시 입혀야 한다. 좁힌 자리에는 전부 주석을 달아 두었다.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* --------------------------------------------------------------------------
 * CHECK 제약으로 값이 정해진 컬럼 (CLI 는 string 으로 내보낸다)
 * -------------------------------------------------------------------------- */

/** `auctions.status` — 상태는 둘뿐이다. '마감 임박'은 end_at 으로 계산하는 파생 상태다 (P5) */
export type AuctionStatus = "OPEN" | "CLOSED";

/** `points.type` — 신규 발행은 SIGNUP_BONUS 하나뿐이다 (데이터 모델 §3.7) */
export type PointType =
  | "SIGNUP_BONUS"
  | "BID"
  | "BID_REFUND_LOST"
  | "BID_REFUND_VOID"
  | "BID_REFUND_CANCEL"
  | "WIN_TRANSFER";

/** `notifications.type` — 마감 임박은 단계가 곧 종류다 (migration 09) */
export type NotificationType =
  | "AUCTION_ENDING_SOON_3D"
  | "AUCTION_ENDING_SOON_1D"
  | "AUCTION_ENDING_SOON_1H"
  | "EPISODE_CREATED"
  | "AUCTION_RESULT"
  | "CHAT_MESSAGE";

/** `episodes.bid_amount` — 고정 입찰 단계만 허용한다 (데이터 모델 §11.1) */
export type BidAmount = 0 | 1000 | 1500 | 2000 | 2500 | 3000;

/** `episode_likes.weight` — 주최자 50 / 그 외 10 (데이터 모델 §11.2) */
export type LikeWeight = 10 | 50;

/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nick_name: string;
          avatar_url: string | null;
          point_balance: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          nick_name: string;
          avatar_url?: string | null;
          point_balance?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        // 컬럼 단위 GRANT 로 클라이언트는 nick_name · avatar_url 만 쓸 수 있다
        Update: {
          nick_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };

      addresses: {
        Row: {
          id: string;
          user_id: string;
          recipient: string;
          phone: string;
          zipcode: string;
          address1: string;
          address2: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient: string;
          phone: string;
          zipcode: string;
          address1: string;
          address2?: string | null;
          created_at?: string;
        };
        Update: {
          recipient?: string;
          phone?: string;
          zipcode?: string;
          address1?: string;
          address2?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      auctions: {
        Row: {
          id: string;
          user_id: string;
          /** 발송지 스냅샷(선택). 등록 요건이 아니다 (F1 3.2 개정) */
          address_id: string | null;
          title: string;
          description: string;
          image_urls: string[];
          end_at: string;
          status: AuctionStatus; // ← CLI 는 string
          winning_episode_id: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          address_id?: string | null;
          title: string;
          description: string;
          image_urls: string[];
          end_at: string;
          status?: AuctionStatus;
          winning_episode_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        // 상태·낙찰은 RPC 로만 바꾼다 (supabase/README.md 2)
        Update: {
          title?: string;
          description?: string;
          image_urls?: string[];
          end_at?: string;
          address_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "auctions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auctions_address_id_fkey";
            columns: ["address_id"];
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auctions_winning_episode_id_fkey";
            columns: ["winning_episode_id"];
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };

      episodes: {
        Row: {
          id: string;
          auction_id: string;
          user_id: string;
          title: string;
          content: string;
          bid_amount: BidAmount; // ← CLI 는 number
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          auction_id: string;
          user_id: string;
          title: string;
          content: string;
          bid_amount?: BidAmount;
          created_at?: string;
          updated_at?: string | null;
        };
        // bid_amount 는 place_bid() 로만 바뀐다
        Update: {
          title?: string;
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_auction_id_fkey";
            columns: ["auction_id"];
            referencedRelation: "auctions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episodes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      episode_likes: {
        Row: {
          id: string;
          episode_id: string;
          user_id: string;
          weight: LikeWeight; // ← CLI 는 number
          created_at: string;
        };
        // 생성·삭제 모두 toggle_episode_like() 로만 한다
        Insert: {
          id?: string;
          episode_id: string;
          user_id: string;
          weight: LikeWeight;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "episode_likes_episode_id_fkey";
            columns: ["episode_id"];
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episode_likes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      auction_favorites: {
        Row: {
          id: string;
          auction_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          auction_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "auction_favorites_auction_id_fkey";
            columns: ["auction_id"];
            referencedRelation: "auctions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auction_favorites_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      points: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          type: PointType; // ← CLI 는 string
          auction_id: string | null;
          episode_id: string | null;
          description: string;
          created_at: string;
        };
        // 원장은 append-only 다. 클라이언트에 INSERT 정책이 없다 (P4)
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          type: PointType;
          auction_id?: string | null;
          episode_id?: string | null;
          description: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "points_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      chat_rooms: {
        Row: {
          id: string;
          auction_id: string;
          created_at: string;
        };
        // close_auction() 이 만든다
        Insert: {
          id?: string;
          auction_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "chat_rooms_auction_id_fkey";
            columns: ["auction_id"];
            referencedRelation: "auctions";
            referencedColumns: ["id"];
          },
        ];
      };

      messages: {
        Row: {
          id: string;
          chat_room_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_room_id: string;
          sender_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        // 수신자의 읽음 처리는 mark_messages_read() 로만 한다
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey";
            columns: ["chat_room_id"];
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType; // ← CLI 는 string
          title: string;
          body: string;
          auction_id: string | null;
          chat_room_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        // 생성 경로는 트리거와 서버 함수뿐이다 (supabase/README.md 8)
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          auction_id?: string | null;
          chat_room_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: {
      /** 사연 최종 점수. 낙찰자 선정과 랭킹 표시가 모두 이 뷰를 쓴다 (§5.1) */
      v_episode_scores: {
        Row: {
          episode_id: string;
          auction_id: string;
          user_id: string;
          bid_amount: number;
          like_weight_sum: number;
          total_score: number;
          like_count: number;
          created_at: string;
        };
        Relationships: [];
      };

      /** 목록·카드용. 찜 수는 담지 않는다. 인기순 기준은 episode_count 다 (F2·F7) */
      v_auction_summary: {
        Row: {
          auction_id: string;
          user_id: string;
          title: string;
          thumbnail: string | null;
          end_at: string;
          status: AuctionStatus; // ← CLI 는 string
          closed_at: string | null;
          winning_episode_id: string | null;
          created_at: string;
          episode_count: number;
          top_score: number;
        };
        Relationships: [];
      };

      /** 공개 프로필. 이메일·잔액은 노출하지 않는다 (F3 3.6) */
      v_user_profiles: {
        Row: {
          id: string;
          nick_name: string;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      /** 포인트 입찰. 올리기만 가능하고 차액만 차감한다 (§4.1) */
      place_bid: {
        Args: { p_episode_id: string; p_new_amount: number };
        Returns: Database["public"]["Tables"]["episodes"]["Row"];
      };
      /** 사연 삭제 + 포인트 반환. 직접 DELETE 는 정책이 없다 (§4.3) */
      delete_episode: {
        Args: { p_episode_id: string };
        Returns: undefined;
      };
      /** 공감 토글. 반환값은 '지금 공감한 상태인가' 다 (§4.4) */
      toggle_episode_like: {
        Args: { p_episode_id: string };
        Returns: boolean;
      };
      /** 방을 연 쪽이 받은 메시지를 읽음으로 바꾼다. 갱신 건수를 돌려준다 (F6 3.4) */
      mark_messages_read: {
        Args: { p_chat_room_id: string };
        Returns: number;
      };

      /* --- service_role 전용. 브라우저에서 부를 수 없다 -------------------- */

      /** 마감 처리 (§4.2) */
      close_auction: {
        Args: { p_auction_id: string };
        Returns: Database["public"]["Tables"]["auctions"]["Row"];
      };
      /** 마감 대상 일괄 처리. pg_cron 이 1분마다 부른다 (§9) */
      close_due_auctions: {
        Args: Record<string, never>;
        Returns: number;
      };
      /** 마감 임박 알림. pg_cron 이 5분마다 부른다 (§11.3) */
      notify_ending_soon: {
        Args: Record<string, never>;
        Returns: number;
      };
    };

    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/* --------------------------------------------------------------------------
 * 짧은 별칭 — 화면 코드가 쓰기 좋게
 * -------------------------------------------------------------------------- */

type Public = Database["public"];

export type Tables<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Update"];
export type Views<T extends keyof Public["Views"]> = Public["Views"][T]["Row"];

export type User = Tables<"users">;
export type Address = Tables<"addresses">;
export type Auction = Tables<"auctions">;
export type Episode = Tables<"episodes">;
export type EpisodeLike = Tables<"episode_likes">;
export type AuctionFavorite = Tables<"auction_favorites">;
export type Point = Tables<"points">;
export type ChatRoom = Tables<"chat_rooms">;
export type Message = Tables<"messages">;
export type Notification = Tables<"notifications">;

export type EpisodeScore = Views<"v_episode_scores">;
export type AuctionSummary = Views<"v_auction_summary">;
export type UserProfile = Views<"v_user_profiles">;
