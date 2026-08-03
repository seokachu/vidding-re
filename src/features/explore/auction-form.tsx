"use client";

import { ImageOff, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
 *
 * **첫 장이 대표 사진이다.** 모바일 갤러리처럼 썸네일을 옆으로 끌어 순서를
 * 바꾼다. 세로 손짓은 페이지 스크롤로 남긴다 (`touch-action: pan-y`).
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

/** 드래그 중인 슬롯의 이동 상태. `dx` 는 손가락을 따라간 픽셀 거리다 */
type Drag = {
  key: string;
  from: number;
  to: number;
  dx: number;
  /** 슬롯 한 칸의 폭 + 간격. 몇 칸 움직였는지 계산하는 기준이다 */
  step: number;
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
  const [saved, setSaved] = useState(false);

  // 수정 저장 뒤 상세로 '뒤로' 간다. 상세는 이미 히스토리에 있으므로 새로 쌓지
  // 않는다 — 쌓으면 상세가 두 번 남아 뒤로가기가 헛돈다.
  // 단, 액션의 revalidate 가 히스토리에 반영되기 전에 back 을 부르면 Next 가
  // /edit 을 한 번 더 밀어 넣는다. 전환이 끝난 다음 틱까지 기다린다.
  useEffect(() => {
    if (!saved || pending) return;
    const id = setTimeout(() => router.back(), 0);
    return () => clearTimeout(id);
  }, [saved, pending, router]);

  const fileInput = useRef<HTMLInputElement>(null);
  const slotRow = useRef<HTMLDivElement>(null);

  /** 업로드 대상 폴더. 수정이면 경매 폴더, 등록이면 이 폼 세션 폴더다 */
  const folderRef = useRef(auction?.id ?? crypto.randomUUID());

  /** 드래그 판정 전, 누른 지점. 세로로 움직이면 스크롤에 양보하고 버린다 */
  const press = useRef<{
    key: string;
    index: number;
    pointerId: number;
    x: number;
    y: number;
    step: number;
  } | null>(null);
  /** 리렌더를 기다리지 않고 최신 드래그 상태를 읽기 위한 거울 */
  const dragLive = useRef<Drag | null>(null);
  /** 드래그로 끝난 손짓이 X 버튼 클릭으로 새지 않게 막는 표식 */
  const draggedOnce = useRef(false);
  const [drag, setDragState] = useState<Drag | null>(null);

  function setDrag(next: Drag | null) {
    dragLive.current = next;
    setDragState(next);
  }

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

  function onSlotPointerDown(
    event: React.PointerEvent,
    slot: Slot,
    index: number,
  ) {
    // 새 손짓이 시작되면 지난 드래그의 클릭 무시 표식부터 지운다
    draggedOnce.current = false;
    if (slots.length < 2 || !event.isPrimary) return;
    const row = slotRow.current;
    if (!row || row.children.length < 2) return;
    // 칸은 전부 flex-1 로 같은 폭이라, 이웃한 두 칸의 간격이 곧 한 칸이다
    const step =
      (row.children[1] as HTMLElement).offsetLeft -
      (row.children[0] as HTMLElement).offsetLeft;
    press.current = {
      key: slot.key,
      index,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      step,
    };
  }

  function onSlotPointerMove(event: React.PointerEvent) {
    const start = press.current;
    // 처음 누른 손가락만 따라간다. 나중에 닿은 손가락은 무시한다
    if (!start || event.pointerId !== start.pointerId) return;

    const rawDx = event.clientX - start.x;
    if (!draggedOnce.current) {
      // 가로로 확실히 움직일 때만 드래그다. 세로면 페이지 스크롤이 가져간다
      if (Math.abs(rawDx) < 8 || Math.abs(rawDx) < Math.abs(event.clientY - start.y))
        return;
      draggedOnce.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    // 줄 밖으로는 못 나간다. 끌린 거리만큼 내려앉을 칸도 같이 정한다
    const last = slots.length - 1;
    const dx = Math.max(
      -start.index * start.step,
      Math.min(rawDx, (last - start.index) * start.step),
    );
    const to = Math.max(
      0,
      Math.min(last, start.index + Math.round(dx / start.step)),
    );
    setDrag({ key: start.key, from: start.index, to, dx, step: start.step });
  }

  /** 손을 뗐다. `commit` 이 false 면(브라우저가 스크롤을 가져감) 제자리로 돌린다 */
  function onSlotPointerEnd(event: React.PointerEvent, commit: boolean) {
    if (press.current && event.pointerId !== press.current.pointerId) return;
    press.current = null;
    const active = dragLive.current;
    if (!active) return;
    setDrag(null);
    if (commit && active.to !== active.from) {
      setSlots((current) => {
        const next = [...current];
        const [moved] = next.splice(active.from, 1);
        next.splice(active.to, 0, moved);
        return next;
      });
    }
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

      // 등록 성공은 서버가 상세로 보낸다(replace). 여기 오는 것은 수정 성공과 실패다
      if (result.ok) {
        setSaved(true);
        return;
      }

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

  // 대표 배지가 붙을 슬롯. 드래그 중에는 첫 칸을 차지하게 될 슬롯에 미리 옮겨 붙인다
  const coverKey = drag
    ? drag.to === 0
      ? drag.key
      : drag.from === 0
        ? slots[1]?.key
        : slots[0]?.key
    : slots[0]?.key;

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

          <div ref={slotRow} className="flex gap-2.5">
            {[...Array(AUCTION_IMAGE_MAX).keys()].map((index) => {
              const slot = slots[index];
              if (slot) {
                const active = drag?.key === slot.key;
                // 드래그가 지나간 슬롯은 한 칸씩 비켜 준다
                let shift = 0;
                if (drag && !active) {
                  if (drag.from < index && index <= drag.to) shift = -drag.step;
                  else if (drag.to <= index && index < drag.from)
                    shift = drag.step;
                }
                return (
                  <div
                    key={slot.key}
                    className={cn(
                      "relative h-[106px] flex-1 touch-pan-y select-none",
                      slots.length > 1 && "cursor-grab",
                      active && "z-10 cursor-grabbing rounded-md shadow-lg",
                    )}
                    style={
                      active
                        ? {
                            transform: `translateX(${drag.dx}px) scale(1.04)`,
                            transition: "none",
                          }
                        : drag
                          ? {
                              transform: `translateX(${shift}px)`,
                              transition: "transform 150ms ease",
                            }
                          : undefined
                    }
                    onPointerDown={(event) =>
                      onSlotPointerDown(event, slot, index)
                    }
                    onPointerMove={onSlotPointerMove}
                    onPointerUp={(event) => onSlotPointerEnd(event, true)}
                    onPointerCancel={(event) => onSlotPointerEnd(event, false)}
                    onClickCapture={(event) => {
                      if (!draggedOnce.current) return;
                      draggedOnce.current = false;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <SlotView
                      slot={slot}
                      onRemove={() => removeSlot(slot)}
                      onRetry={() => {
                        if (!slot.file) return;
                        patchSlot(slot.key, { status: "uploading" });
                        void upload(slot.key, slot.file);
                      }}
                    />
                    {slot.key === coverKey && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-text-primary/70 py-[3px] text-center text-label font-semibold text-text-on-accent">
                        대표 사진
                      </span>
                    )}
                  </div>
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
      <div className="flex h-full w-full items-center justify-center rounded-md bg-surface-sunken text-text-tertiary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (slot.status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-warning bg-warning-subtle text-warning-text"
      >
        <ImageOff size={18} />
        <span className="text-label font-semibold">다시 시도</span>
      </button>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-surface-sunken">
      {slot.url && (
        <Image
          src={slot.url}
          alt=""
          fill
          sizes="110px"
          // 브라우저 기본 이미지 드래그가 우리 드래그를 가로채지 않게 한다
          draggable={false}
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
