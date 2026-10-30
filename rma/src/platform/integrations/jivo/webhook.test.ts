// The JivoChat module — JIVO_LINES parsing, both payload dialects (Webhooks
// API `event_name` + Bot API `event`), insert shape/dedupe, the unknown-site
// refusal, and the phone-less visitor identity.
//
// Every behaviour that can lose, misroute, or duplicate a lead is pinned here.
import { describe, expect, it } from "vitest";
import {
  ingestJivoWebhook,
  jivoChannel,
  jivoFromValue,
  jivoLineMap,
  JivoUnknownSiteError,
  parseJivoWebhook,
  resolveJivoSite,
  type JivoStore,
} from "./webhook";

const ENV = {
  // Two JivoChat accounts: sales board (take-auto) and rental board (easyrent).
  JIVO_LINES: "111111:take-auto,222222:easyrent",
};

function botClientMessage(overrides: {
  siteId?: string;
  eventId?: string;
  clientId?: string;
  chatId?: string;
  text?: string;
  channelType?: string;
  name?: string;
  timestamp?: number;
  messageType?: string;
}) {
  return {
    event: "CLIENT_MESSAGE",
    id: overrides.eventId ?? "9661ab9c-48b0-11ed-a3d6-859398ff9bd9",
    site_id: overrides.siteId ?? "111111",
    client_id: overrides.clientId ?? "47454",
    chat_id: overrides.chatId ?? "2037",
    agents_online: true,
    sender: { id: Number(overrides.clientId ?? 47454), name: overrides.name ?? "John Smith", has_contacts: false },
    message: { type: overrides.messageType ?? "TEXT", text: overrides.text ?? "Need a Camry for a week", timestamp: overrides.timestamp ?? 1665415879 },
    channel: { id: "ch-1", type: overrides.channelType ?? "widget" },
  };
}

function offlineMessage(overrides: {
  siteId?: string;
  offlineId?: number;
  message?: string;
  visitor?: Record<string, unknown>;
}) {
  return {
    event_name: "offline_message",
    site_id: overrides.siteId ?? "222222",
    widget_id: "3948",
    chat_id: 2026,
    visitor: overrides.visitor ?? {
      name: "Sanaa M",
      email: "sanaa@example.com",
      phone: "+971 54 366 6118",
      number: "2198",
    },
    message: overrides.message ?? "Do you have a Tesla for this weekend?",
    offline_message_id: overrides.offlineId ?? 1665399500726,
  };
}

describe("jivoLineMap / resolveJivoSite — JIVO_LINES routing", () => {
  it("parses siteId:tenantSlug pairs, tolerating spaces and empty entries", () => {
    expect(jivoLineMap(ENV)).toEqual({ "111111": "take-auto", "222222": "easyrent" });
    expect(jivoLineMap({ JIVO_LINES: " a : b ,, c:d " })).toEqual({ a: "b", c: "d" });
  });

  it("an unset var is an empty map — every event then throws unknown-site", () => {
    expect(jivoLineMap({})).toEqual({});
  });

  it("a malformed pair throws — a half-parsed routing table is how chats land on the wrong desk", () => {
    expect(() => jivoLineMap({ JIVO_LINES: "111111" })).toThrow(JivoUnknownSiteError);
    expect(() => jivoLineMap({ JIVO_LINES: "111111:UPPER CASE" })).toThrow(JivoUnknownSiteError);
  });

  it("resolveJivoSite derives the Twenty instance from the tenant (never re-declared)", () => {
    // twentyInstanceForTenantSlug: default rental set is cardiwan,easyrent,etm.
    expect(resolveJivoSite("222222", ENV)).toEqual({ siteId: "222222", tenantSlug: "easyrent", instance: "rental" });
    expect(resolveJivoSite("111111", ENV)).toEqual({ siteId: "111111", tenantSlug: "take-auto", instance: "default" });
  });

  it("an unknown site_id THROWS — never a default tenant", () => {
    expect(() => resolveJivoSite("999999", ENV)).toThrow(JivoUnknownSiteError);
  });
});

describe("parseJivoWebhook — the Bot API dialect (per-message, real time)", () => {
  it("a widget CLIENT_MESSAGE becomes an inbound row draft on the site's tenant", () => {
    const { messages } = parseJivoWebhook(botClientMessage({}), ENV);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      site: { siteId: "111111", tenantSlug: "take-auto", instance: "default" },
      from: "jivo:111111:47454",
      fromPn: null, // the bot dialect carries no phone
      customerName: "John Smith",
      channel: "jivo",
      body: "Need a Camry for a week",
      externalMessageId: "jivo:111111:evt:9661ab9c-48b0-11ed-a3d6-859398ff9bd9",
      at: new Date(1665415879 * 1000),
      clientId: "47454",
      chatId: "2037",
    });
  });

  it("the real channel maps into the house vocabulary (instagram / messenger / jivo)", () => {
    expect(parseJivoWebhook(botClientMessage({ channelType: "instagram" }), ENV).messages[0].channel).toBe("instagram");
    expect(parseJivoWebhook(botClientMessage({ channelType: "facebook" }), ENV).messages[0].channel).toBe("messenger");
    expect(parseJivoWebhook(botClientMessage({ channelType: "telegram" }), ENV).messages[0].channel).toBe("jivo");
    expect(jivoChannel(null)).toBe("jivo");
  });

  it("media messages keep the house placeholders + filename (idDocumentSent keys on EID_ names)", () => {
    const photo = botClientMessage({ messageType: "PHOTO" });
    (photo.message as Record<string, unknown>).text = undefined;
    (photo.message as Record<string, unknown>).file_name = "EID_784197922876145_AHMAD.png";
    const { messages } = parseJivoWebhook(photo, ENV);
    expect(messages[0].body).toBe("[image] EID_784197922876145_AHMAD.png");
  });

  it("a millisecond timestamp is accepted alongside seconds", () => {
    const { messages } = parseJivoWebhook(botClientMessage({ timestamp: 1665415879000 }), ENV);
    expect(messages[0].at).toEqual(new Date(1665415879 * 1000));
  });

  it("a CLIENT_MESSAGE without text or client id is counted and dropped", () => {
    const r = parseJivoWebhook(botClientMessage({ text: "" }), ENV);
    expect(r.messages).toHaveLength(0);
    expect(r.skippedNonMessage).toBe(1);
  });

  it("CHAT_CLOSED / AGENT_UNAVAILABLE are ignored gracefully", () => {
    const r = parseJivoWebhook(
      { event: "CHAT_CLOSED", id: "e1", site_id: "111111", client_id: "47454", chat_id: "2037" },
      ENV
    );
    expect(r.messages).toHaveLength(0);
    expect(r.ignoredEvents).toEqual(["CHAT_CLOSED"]);
  });
});

describe("parseJivoWebhook — the Webhooks API dialect", () => {
  it("offline_message becomes a lead row with the visitor's name, phone and email", () => {
    const { messages } = parseJivoWebhook(offlineMessage({}), ENV);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      site: { siteId: "222222", tenantSlug: "easyrent", instance: "rental" },
      from: "jivo:222222:2198",
      fromPn: "971543666118", // visitor.phone — the tail9 stitch key
      customerName: "Sanaa M",
      channel: "jivo", // the webhooks dialect names no channel
      body: "Do you have a Tesla for this weekend?",
      externalMessageId: "jivo:222222:offline:1665399500726",
      chatId: "2026",
    });
    expect((messages[0].sourceMeta as { jivo: { email: string } }).jivo.email).toBe("sanaa@example.com");
  });

  it("a visitor WITHOUT a phone gets the stable pseudo-identity (from_pn NULL)", () => {
    const { messages } = parseJivoWebhook(
      offlineMessage({ visitor: { name: null, number: "3401" } }),
      ENV
    );
    expect(messages[0].from).toBe(jivoFromValue("222222", "3401"));
    expect(messages[0].fromPn).toBeNull();
    expect(messages[0].customerName).toBeNull();
  });

  it("chat_finished files every VISITOR line of the log; agent lines are skipped like is_echo", () => {
    const payload = {
      event_name: "chat_finished",
      site_id: "111111",
      chat_id: 7607,
      visitor: { name: "John Smith", number: "2198" },
      agents: [{ id: "2016", name: "Thomas Anderson" }],
      chat: {
        messages: [
          { message: "Hi, is the G63 available?", timestamp: 1665396476, type: "visitor" },
          { message: "Yes it is", timestamp: 1665396483, type: "agent", agent_id: 1 },
          { message: "How much for a week?", timestamp: 1665396483, type: "visitor" }, // same second as the agent line
        ],
      },
    };
    const { messages } = parseJivoWebhook(payload, ENV);
    expect(messages).toHaveLength(2);
    expect(messages[0].body).toBe("Hi, is the G63 available?");
    expect(messages[0].externalMessageId).toBe("jivo:111111:chat:7607:1665396476:0");
    // Same-second visitor lines still get distinct extids (the sequence index).
    expect(messages[1].externalMessageId).toBe("jivo:111111:chat:7607:1665396483:1");
    expect((messages[0].sourceMeta as { jivo: { agentName: string } }).jivo.agentName).toBe("Thomas Anderson");
  });

  it("chat_accepted / chat_updated / call_event are ignored gracefully", () => {
    for (const event_name of ["chat_accepted", "chat_updated", "call_event"]) {
      const r = parseJivoWebhook({ event_name, site_id: "111111", chat_id: 1, visitor: { number: "1" } }, ENV);
      expect(r.messages).toHaveLength(0);
      expect(r.ignoredEvents).toEqual([event_name]);
    }
  });

  it("falls back to widget_id when a webhooks payload predates site_id", () => {
    const payload = offlineMessage({});
    delete (payload as Record<string, unknown>).site_id;
    (payload as Record<string, unknown>).widget_id = "222222";
    const { messages } = parseJivoWebhook(payload, ENV);
    expect(messages[0].site.siteId).toBe("222222");
  });
});

describe("parseJivoWebhook — the loud refusals", () => {
  it("an unknown site_id throws on BOTH dialects", () => {
    expect(() => parseJivoWebhook(botClientMessage({ siteId: "999999" }), ENV)).toThrow(JivoUnknownSiteError);
    expect(() => parseJivoWebhook(offlineMessage({ siteId: "999999" }), ENV)).toThrow(JivoUnknownSiteError);
    // …even on an ignored lifecycle event — an unmapped account posting to us
    // is a config gap, and config gaps fail loud.
    expect(() => parseJivoWebhook({ event: "CHAT_CLOSED", site_id: "999999", id: "e" }, ENV)).toThrow(
      JivoUnknownSiteError
    );
  });

  it("a message-bearing event with no site_id/widget_id cannot be routed — throws", () => {
    const payload = offlineMessage({});
    delete (payload as Record<string, unknown>).site_id;
    (payload as Record<string, unknown>).widget_id = undefined;
    expect(() => parseJivoWebhook(payload, ENV)).toThrow(JivoUnknownSiteError);
  });

  it("an ignored event with no site id is simply ignored (nothing to route)", () => {
    const r = parseJivoWebhook({ event: "CHAT_CLOSED", id: "e", chat_id: "1", client_id: "2" }, ENV);
    expect(r.ignoredEvents).toEqual(["CHAT_CLOSED"]);
  });
});

describe("ingestJivoWebhook — insert shape, dedupe, first-contact ack", () => {
  function fakeStore(opts: { existing?: Set<string>; tenantId?: string | null } = {}) {
    const inserted: Record<string, unknown>[] = [];
    const store: JivoStore = {
      tenantIdForSlug: async () => (opts.tenantId === undefined ? "tenant-1" : opts.tenantId),
      insertInbound: async (row) => {
        if (opts.existing?.has(row.externalMessageId)) return false;
        inserted.push({ ...row });
        return true;
      },
      countInboundForVisitor: async (_tenantId, from) =>
        inserted.filter((r) => r.from === from).length,
    };
    return { store, inserted };
  }

  it("inserts an inbound row keyed (tenant, extid) with the channel metadata", async () => {
    const { store, inserted } = fakeStore();
    const r = await ingestJivoWebhook(store, botClientMessage({}), { env: ENV });
    expect(r.received).toBe(1);
    expect(r.inserted).toBe(1);
    expect(inserted[0]).toMatchObject({
      tenantId: "tenant-1",
      channel: "jivo",
      from: "jivo:111111:47454",
      to: "jivo:111111",
      fromPn: null,
      customerName: "John Smith",
      body: "Need a Camry for a week",
      externalMessageId: "jivo:111111:evt:9661ab9c-48b0-11ed-a3d6-859398ff9bd9",
    });
    expect((inserted[0].sourceMeta as { jivo: { channelType: string } }).jivo.channelType).toBe("widget");
  });

  it("a duplicate extid inserts nothing (Jivo's two retries are absorbed) — and never re-acks", async () => {
    const { store, inserted } = fakeStore({ existing: new Set(["jivo:111111:evt:9661ab9c-48b0-11ed-a3d6-859398ff9bd9"]) });
    const r = await ingestJivoWebhook(store, botClientMessage({}), { env: ENV });
    expect(r.inserted).toBe(0);
    expect(r.duplicates).toBe(1);
    expect(r.ackJobs).toHaveLength(0);
    expect(inserted).toHaveLength(0);
  });

  it("the first contact of a visitor queues exactly one ack job; the second message queues none", async () => {
    const { store } = fakeStore();
    const first = await ingestJivoWebhook(store, botClientMessage({}), { env: ENV });
    expect(first.ackJobs).toEqual([{ clientId: "47454", chatId: "2037", tenantSlug: "take-auto" }]);
    const second = await ingestJivoWebhook(
      store,
      botClientMessage({ eventId: "e2", text: "anyone there?" }),
      { env: ENV }
    );
    expect(second.inserted).toBe(1);
    expect(second.ackJobs).toHaveLength(0);
  });

  it("a webhooks-dialect row with a phone carries from_pn for the tail9 stitch", async () => {
    const { store, inserted } = fakeStore();
    await ingestJivoWebhook(store, offlineMessage({}), { env: ENV });
    expect(inserted[0].fromPn).toBe("971543666118");
  });

  it("an unresolvable tenant drops the message but never the webhook", async () => {
    const { store } = fakeStore({ tenantId: null });
    const r = await ingestJivoWebhook(store, botClientMessage({}), { env: ENV });
    expect(r.inserted).toBe(0);
    expect(r.skippedNoTenant).toBe(1);
    expect(r.ackJobs).toHaveLength(0);
  });

  it("an unknown site_id propagates out of ingest (the route answers 500)", async () => {
    const { store } = fakeStore();
    await expect(ingestJivoWebhook(store, botClientMessage({ siteId: "999999" }), { env: ENV })).rejects.toThrow(
      JivoUnknownSiteError
    );
  });
});
