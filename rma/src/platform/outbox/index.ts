import { createHash } from "crypto";
import { db } from "@/platform/db/client";
import { waOutbox } from "./schema";
import { screenOutbound } from "./send-safety";

export type EnqueuePayload = {
  tenantId:    string;
  boardItemId: string;
  toJid:       string;
  brandLine:   string;
  body:        string;
  approvedBy:  string;
  // Attachment send: absolute path on the observer box + its mime/kind. When
  // set, bridge.js reads the file and sends it via Baileys with `body` as the
  // caption. Omitted for plain-text replies.
  media?: { path: string; mime: string; kind: "image" | "video" | "audio" | "document" };
};

/**
 * Insert a pending outbox row inside an existing Drizzle tenant transaction.
 * Must be called from within withDrizzleTenant() so the RLS GUCs are already set
 * — this mirrors the callback shape used across the board actions, where `tx`
 * is typed as `typeof db` (see src/platform/tenancy/rls.ts).
 *
 * Silently no-ops if an identical body is already pending for the same
 * board_item_id (unique index on (board_item_id, content_hash) WHERE status='pending').
 */
export async function enqueueOutbox(
  tx: typeof db,
  payload: EnqueuePayload,
): Promise<void> {
  // Hash over body + media path so two attachment sends that share a caption
  // (or an empty caption) don't collapse under the (board_item_id, content_hash)
  // dedupe index the way two identical text replies intentionally do.
  const contentHash = createHash("md5")
    .update(payload.media ? `${payload.media.path}\x00${payload.body}` : payload.body)
    .digest("hex");

  // Stop-word guardrail: a body carrying sensitive financial language is
  // enqueued flagged=true and held by the drain until a senior clears it.
  const { flagged, matched } = screenOutbound(payload.body);

  await tx
    .insert(waOutbox)
    .values({
      tenantId:    payload.tenantId,
      boardItemId: payload.boardItemId,
      toJid:       payload.toJid,
      brandLine:   payload.brandLine,
      body:        payload.body,
      approvedBy:  payload.approvedBy,
      contentHash,
      mediaPath:   payload.media?.path ?? null,
      mediaMime:   payload.media?.mime ?? null,
      mediaKind:   payload.media?.kind ?? null,
      flagged,
      flaggedWords: flagged ? matched.join(", ") : null,
    })
    .onConflictDoNothing();
}
