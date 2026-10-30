import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/platform/db/client";
import { resolveReplyContext } from "./chat-shared";
import {
  hasTestDatabase,
  createTestTenant,
  createTestLead,
  createTestInboundMessage,
  cleanupTestEntities,
  resetPool,
} from "@/test/db";

/**
 * The composer on a lead's chat is enabled only when resolveReplyContext can
 * say WHICH line to answer from. It used to look that up in board_item alone,
 * which meant a conversation the AI classifier had never touched could be read
 * but never answered — with nothing on screen explaining why.
 *
 * That was most conversations: measured on production 2026-07-25, all 22,930
 * inbound WhatsApp messages carry their line in `message."to"`, while only
 * 1,033 board_item rows exist at all and just 513 of those have source_line.
 */
describe.skipIf(!hasTestDatabase())("resolveReplyContext", () => {
  const ids = { tenant: "", leadWithLine: "", leadWithoutLine: "" };

  beforeAll(async () => {
    const t = await createTestTenant("replyctx-tenant", "Reply Context Tenant");
    ids.tenant = t.id;

    const withLine = await createTestLead(t.id, "Has Line");
    ids.leadWithLine = withLine.id;
    await createTestInboundMessage(t.id, withLine.id, {
      from: "971500000001@s.whatsapp.net",
      line: "babek-rent",
    });

    const withoutLine = await createTestLead(t.id, "No Line");
    ids.leadWithoutLine = withoutLine.id;
    await createTestInboundMessage(t.id, withoutLine.id, {
      from: "971500000002@s.whatsapp.net",
      line: null,
    });
  });

  afterAll(async () => {
    await cleanupTestEntities({ tenants: [ids.tenant] });
    await resetPool();
  });

  it("resolves the line from the message itself, with no board_item row", async () => {
    // The regression this pins: no board card exists for this thread, and the
    // reply must still be possible.
    const ctx = await resolveReplyContext(db, ids.tenant, "lead", ids.leadWithLine);
    expect(ctx).not.toBeNull();
    expect(ctx?.brandLine).toBe("babek-rent");
    expect(ctx?.toJid).toBe("971500000001@s.whatsapp.net");
    // The inbound's own identity is surfaced so a reply can be stamped in the
    // observer convention (to=line, coalesce(from_pn, from)=contact) and clear
    // the «Ждут ответа» card. This thread had no from_pn, so the raw from wins.
    expect(ctx?.contactFrom).toBe("971500000001@s.whatsapp.net");
    expect(ctx?.contactPn).toBeNull();
  });

  it("still refuses when nothing anywhere names a line", async () => {
    // Sending from an unknown line is worse than not sending: it would reach
    // the customer from whichever phone the observer happened to pick.
    expect(await resolveReplyContext(db, ids.tenant, "lead", ids.leadWithoutLine)).toBeNull();
  });

  it("refuses for a lead with no inbound message at all", async () => {
    const empty = await createTestLead(ids.tenant, "Silent");
    expect(await resolveReplyContext(db, ids.tenant, "lead", empty.id)).toBeNull();
  });

  it("prefers the resolved phone over the thread jid as the reply target", async () => {
    // @lid threads carry no real number; from_pn is the recovered one, and a
    // reply must go to the person rather than back into the opaque thread.
    // from_pn holds a BARE number in production (e.g. "971543848245") — the
    // jid suffix is added by resolveReplyToJid, so a fixture carrying the full
    // jid would double it.
    const lead = await createTestLead(ids.tenant, "Lid Thread");
    await createTestInboundMessage(ids.tenant, lead.id, {
      from: "123456789@lid",
      fromPn: "971500000003",
      line: "cardiwan",
    });
    const ctx = await resolveReplyContext(db, ids.tenant, "lead", lead.id);
    expect(ctx?.toJid).toBe("971500000003@s.whatsapp.net");
    expect(ctx?.brandLine).toBe("cardiwan");
  });

  it("never answers into a group", async () => {
    const lead = await createTestLead(ids.tenant, "Group Thread");
    await createTestInboundMessage(ids.tenant, lead.id, {
      from: "120363000000000000@g.us",
      line: "cardiwan",
    });
    expect(await resolveReplyContext(db, ids.tenant, "lead", lead.id)).toBeNull();
  });
});
