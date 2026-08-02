"use client";

import { ImageOff, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button, TextAreaField, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  AUCTION_DURATION_DEFAULT,
  AUCTION_IMAGE_BUCKET,
  AUCTION_IMAGE_MAX,
  AUCTION_IMAGE_MAX_BYTES,
  AUCTION_IMAGE_MIME,
} from "@/lib/constants";
import { ROUTES, signinWithReturn } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { createAuction, updateAuction } from "./auction-actions";
import {
  AUCTION_DESCRIPTION_MAX,
  AUCTION_DURATION_DAYS,
  AUCTION_TITLE_MAX,
  hasFieldError,
  validateAuctionInput,
  type AuctionFieldErrors,
} from "./auction-input";

/**
 * 경매 등록·수정 폼 (S06 · F1 3.3).
 *
 * **입력은 4개뿐이다** — 이미지 · 제목 · 사연 요청 설명 · 기간 (완료 조건 8).
 * 포인트 입력이 없고, 기간은 날짜·시간 피커가 아니라 **버튼 3개**다 (완료 조건 9).
 *
 * 수정일 때는 기간을 다시 고르지 않는다. 마감 시각은 등록 시점에 정해지고,
 * 뒤늦게 옮기면 이미 사연을 쓴 사람의 남은 시간이 말없이 바뀐다.
 *
 * 이미지는 고른 즉시 Storage 로 올린다. **실패한 장만 다시 시도**할 수 있고
 * 나머지 입력값은 그대로 남는다 (F1 4.3).
 */

type Slot = {
  key: string;
  status: "uploading" | "ready" | "error";
  /** 업로드가 끝난 공개 URL */
  url?: string;
  /** 버킷 안 경로. 지울 때 쓴다 */
  path?: string;
  /** 재시도용 원본 */
  file?: File;
};

export function AuctionForm({
  userId,
  /** 수정이면 대상 경매. 없으면 등록이다 */
  auction,
}: {
  userId: string;
  auction?: {
    id: string;
    title: string;
    description: string;
    imageUrls: string[];
  };
}) {
  const router = useRouter();
  const editing = auction !== undefined;

  const [slots, setSlots] = useState<Slot[]>(() =>
    (auction?.imageUrls ?? []).map((url) => ({
      key: url,
      status: "ready" as const,
      url,
      path: storageObjectPath(url) ?? undefined,
    })),
  );
  const [title, setTitle] = useState(auction?.title ?? "");
  const [description, setDescription] = useState(auction?.description ?? "");
  // 기간 미선택으로 막히지 않도록 1일을 미리 골라 둔다 (F1 4.2)
  const [days, setDays] = useState<number>(AUCTION_DURATION_DEFAULT);

  const [fieldErrors, setFieldErrors] = useState<AuctionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fileInput = useRef<HTMLInputElement>(null);

  /** 업로드 대상 폴더. 수정이면 경매 폴더, 등록이면 이 폼 세션 폴더다 */
  const folderRef = useRef(auction?.id ?? crypto.randomUUID());

  const uploading = slots.some((slot) => slot.status === "uploading");
  const readyUrls = slots
    .filter((slot) => slot.status === "ready" && slot.url)
    .map((slot) => slot.url as string);
  const canAdd = slots.length < AUCTION_IMAGE_MAX;

  function patchSlot(key: string, patch: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    );
  }

  async function upload(key: string, file: File) {
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // 경로 규칙은 `{user_id}/{...}/{filename}` 이다. 첫 칸이 내 uid 여야 정책을 통과한다
    const path = `${userId}/${folderRef.current}/${key}.${extension}`;

    const { error } = await supabase.storage
      .from(AUCTION_IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      patchSlot(key, { status: "error" });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(AUCTION_IMAGE_BUCKET).getPublicUrl(path);

    patchSlot(key, { status: "ready", url: publicUrl, path });
  }

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFieldErrors((errors) => ({ ...errors, images: undefined }));

    const room = AUCTION_IMAGE_MAX - slots.length;
    const picked = Array.from(files).slice(0, room);

    for (const file of picked) {
      if (!(AUCTION_IMAGE_MIME as readonly string[]).includes(file.type)) {
        setFieldErrors((errors) => ({
          ...errors,
          images: "jpg · png · webp 만 올릴 수 있어요",
        }));
        continue;
      }
      if (file.size > AUCTION_IMAGE_MAX_BYTES) {
        setFieldErrors((errors) => ({
          ...errors,
          images: "한 장에 5MB 까지 올릴 수 있어요",
        }));
        continue;
      }

      const key = crypto.randomUUID();
      setSlots((current) => [
        ...current,
        { key, status: "uploading", file },
      ]);
      void upload(key, file);
    }

    if (fileInput.current) fileInput.current.value = "";
  }

  function removeSlot(slot: Slot) {
    setSlots((current) => current.filter((item) => item.key !== slot.key));
    // 지운 사진의 파일까지 정리한다. 실패해도 폼은 계속 쓸 수 있어야 하므로 기다리지 않는다
    if (slot.path) {
      void createClient()
        .storage.from(AUCTION_IMAGE_BUCKET)
        .remove([slot.path]);
    }
  }

  function submit() {
    if (pending || uploading) return;

    const input = {
      title,
      description,
      imageUrls: readyUrls,
      days,
    };

    const errors = validateAuctionInput(input);
    if (editing) delete errors.days;

    setFieldErrors(errors);
    setFormError(null);
    if (hasFieldError(errors)) return;

    startTransition(async () => {
      const result = editing
        ? await updateAuction(auction.id, input)
        : await createAuction(input);

      // 성공하면 서버가 상세로 보내므로, 여기 오는 것은 실패뿐이다
      switch (result.reason) {
        case "INVALID":
          setFieldErrors(result.fieldErrors);
          return;
        case "UNAUTHENTICATED":
          router.push(signinWithReturn(ROUTES.auctionWrite));
          return;
        case "FORBIDDEN":
          setFormError("이 경매는 수정할 수 없어요");
          return;
        default:
          setFormError(result.message);
      }
    });
  }

  return (
    <>
      <div className="flex flex-1 flex-col pb-6">
        <section className="flex flex-col gap-2.5 px-gutter pt-5">
          <FieldLabelRow
            label="사진"
            required
            count={`${slots.length} / ${AUCTION_IMAGE_MAX}`}
            over={false}
          />

          <div className="flex gap-2.5">
            {[...Array(AUCTION_IMAGE_MAX).keys()].map((index) => {
              const slot = slots[index];
              if (slot) {
                return (
                  <SlotView
                    key={slot.key}
                    slot={slot}
                    onRemove={() => removeSlot(slot)}
                    onRetry={() => {
                      if (!slot.file) return;
                      patchSlot(slot.key, { status: "uploading" });
                      void upload(slot.key, slot.file);
                    }}
                  />
                );
              }

              return (
                <button
                  key={`empty-${index}`}
                  type="button"
                  // 3장을 채우면 더 고를 자리가 없다 (F1 4.2)
                  disabled={!canAdd}
                  onClick={() => fileInput.current?.click()}
                  aria-label="사진 추가"
                  className="flex h-[106px] flex-1 items-center justify-center rounded-md border border-border-strong bg-bg text-text-tertiary hover:bg-surface disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              );
            })}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept={AUCTION_IMAGE_MIME.join(",")}
            multiple
            hidden
            onChange={(event) => onPick(event.target.files)}
          />

          {fieldErrors.images && (
            <p className="text-label text-warning-text">{fieldErrors.images}</p>
          )}
        </section>

        <section className="flex flex-col gap-[22px] px-gutter pt-6">
          <div className="flex flex-col gap-[7px]">
            <FieldLabelRow
              label="제목"
              required
              htmlFor="auction-title"
              count={`${title.length} / ${AUCTION_TITLE_MAX}`}
              over={title.length >= AUCTION_TITLE_MAX}
            />
            <TextField
              id="auction-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="무엇을 나누나요"
              helper="예 · 필름 카메라 나눔"
              error={fieldErrors.title}
              maxLength={AUCTION_TITLE_MAX}
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <FieldLabelRow
              label="사연 요청 설명"
              required
              htmlFor="auction-description"
              count={`${description.length} / ${AUCTION_DESCRIPTION_MAX}`}
              over={description.length >= AUCTION_DESCRIPTION_MAX}
            />
            <TextAreaField
              id="auction-description"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="어떤 사연을 듣고 싶은지 적어 주세요"
              helper="참여자가 무엇을 쓸지 정하는 기준이 됩니다"
              error={fieldErrors.description}
              maxLength={AUCTION_DESCRIPTION_MAX}
            />
          </div>
        </section>

        {!editing && (
          <section className="flex flex-col gap-2.5 px-gutter pt-[22px]">
            <FieldLabelRow label="기간" required />

            <div className="flex gap-[9px]">
              {AUCTION_DURATION_DAYS.map((option) => {
                const selected = option === days;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDays(option)}
                    className={cn(
                      "flex-1 rounded-md py-[14px] text-body font-semibold",
                      selected
                        ? "border-[1.5px] border-accent bg-accent-subtle text-accent-text"
                        : "border border-border-strong bg-bg text-text-secondary hover:bg-surface",
                    )}
                  >
                    {option}일
                  </button>
                );
              })}
            </div>

            <p className="text-label text-text-secondary">
              마감은 등록 시점부터 자동으로 계산돼요
            </p>
          </section>
        )}
      </div>

      {/* 입력값을 잃지 않도록 화면에 머무른 채 사유만 띄운다 (F1 4.3) */}
      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border bg-bg px-gutter pb-[22px] pt-[14px]">
        {formError && (
          <p role="alert" className="text-caption text-warning-text">
            {formError}
          </p>
        )}
        <Button
          block
          // 처리 중에는 제출을 받지 않는다 (F1 4.3)
          disabled={pending || uploading}
          onClick={submit}
        >
          {pending
            ? "보내는 중"
            : uploading
              ? "사진 올리는 중"
              : editing
                ? "수정 완료"
                : "경매 열기"}
        </Button>
      </div>
    </>
  );
}

/**
 * 라벨 + 필수 표시 + 우측 개수. `.pen` S06 의 `Label Row` 다.
 *
 * `FieldShell` 은 우측 자리를 갖고 있지 않은데 F1 4.2 가 "남은 글자 수 실시간 표시"를
 * 요구해서 여기서 만들었다. **`src/components/ui/` 로 올라갈 후보다.**
 */
function FieldLabelRow({
  label,
  required,
  htmlFor,
  count,
  over,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  count?: string;
  over?: boolean;
}) {
  const inner = (
    <>
      {label}
      {required && <span className="text-warning">*</span>}
    </>
  );
  const labelClass =
    "flex items-center gap-[3px] text-label font-semibold text-text-secondary";

  return (
    <div className="flex items-center gap-[3px]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {inner}
        </label>
      ) : (
        <p className={labelClass}>{inner}</p>
      )}
      {count && (
        <span
          className={cn(
            "tabular flex-1 text-right text-label",
            // 한도에 닿으면 경고색으로 바꾼다 (F1 4.2)
            over ? "text-warning-text" : "text-text-tertiary",
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function SlotView({
  slot,
  onRemove,
  onRetry,
}: {
  slot: Slot;
  onRemove: () => void;
  onRetry: () => void;
}) {
  if (slot.status === "uploading") {
    return (
      <div className="flex h-[106px] flex-1 items-center justify-center rounded-md bg-surface-sunken text-text-tertiary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (slot.status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex h-[106px] flex-1 flex-col items-center justify-center gap-1 rounded-md border border-warning bg-warning-subtle text-warning-text"
      >
        <ImageOff size={18} />
        <span className="text-label font-semibold">다시 시도</span>
      </button>
    );
  }

  return (
    <div className="relative h-[106px] flex-1 overflow-hidden rounded-md bg-surface-sunken">
      {slot.url && (
        <Image
          src={slot.url}
          alt=""
          fill
          sizes="110px"
          className="object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="사진 지우기"
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-text-primary/70 text-text-on-accent"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function storageObjectPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${AUCTION_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
