// Drizzle definition for the board_item table (created in drizzle/autonomous/0003_board_item.sql).
// In the drizzle.config schema list so drizzle-kit never proposes dropping it.
import { pgTable, pgEnum, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const boardChannel = pgEnum("board_channel", ["whatsapp", "instagram", "telegram", "call"]);
export const boardIntent = pgEnum("board_intent", ["booking", "price", "complaint", "handover", "payment", "other"]);
export const boardUrgency = pgEnum("board_urgency", ["low", "med", "high"]);
export const boardStatus = pgEnum("board_status", ["open", "approved", "dismissed", "done"]);

export const boardItem = pgTable("board_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  channel: boardChannel("channel").notNull(),
  customerRef: text("customer_ref").notNull(),
  customerName: text("customer_name"),
  summary: text("summary").notNull().default(""),
  intent: boardIntent("intent").notNull().default("other"),
  urgency: boardUrgency("urgency").notNull().default("med"),
  awaitingReply: boolean("awaiting_reply").notNull().default(true),
  suggestedDraft: text("suggested_draft"),
  status: boardStatus("status").notNull().default("open"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
  // Ownership / routing / escalation (added in drizzle/autonomous/0005_board_ownership.sql).
  // sourceLine = WhatsApp line slug (waobs session) the thread came in on.
  // assignedTo = BRAND_OWNERS key or actor email — see src/modules/board/owners.ts.
  sourceLine: text("source_line"),
  assignedTo: text("assigned_to"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  lastEscalatedAt: timestamp("last_escalated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type BoardItem = typeof boardItem.$inferSelect;
