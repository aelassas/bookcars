// Drizzle definition for wa_outbox (created in drizzle/autonomous/0007_wa_outbox.sql).
// status values: 'pending' | 'sent' | 'failed' | 'skipped' | 'skipped_no_observer' — enforced as a CHECK
// constraint in SQL; Drizzle reflects it as plain text.
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export type WaOutboxStatus = "pending" | "sent" | "failed" | "skipped" | "skipped_no_observer";

export const waOutbox = pgTable("wa_outbox", {
  id:          uuid("id").primaryKey().defaultRandom(),
  tenantId:    uuid("tenant_id").notNull(),
  boardItemId: uuid("board_item_id").notNull(),
  toJid:       text("to_jid").notNull(),
  brandLine:   text("brand_line").notNull(),
  body:        text("body").notNull(),
  status:      text("status").$type<WaOutboxStatus>().notNull().default("pending"),
  approvedBy:  text("approved_by").notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt:      timestamp("sent_at", { withTimezone: true }),
  error:       text("error"),
  contentHash: text("content_hash"),
  // Attachment send (bridge.js reads the file at media_path and sends it via
  // Baileys as image/video/audio/document, with `body` as the caption).
  // Null for plain text rows. See wa-observer/sql/0002_wa_outbox_media.sql.
  mediaPath:   text("media_path"),
  mediaMime:   text("media_mime"),
  mediaKind:   text("media_kind"), // image | video | audio | document
  // Stop-word guardrail (send-safety.ts). A flagged row is held by the drain
  // until a senior clears it. See drizzle/autonomous/0008_wa_outbox_flag.sql.
  flagged:          boolean("flagged").notNull().default(false),
  flaggedWords:     text("flagged_words"),
  flaggedClearedBy: text("flagged_cleared_by"),
  flaggedClearedAt: timestamp("flagged_cleared_at", { withTimezone: true }),
});

export type WaOutbox = typeof waOutbox.$inferSelect;
