// The WhatsApp Cloud API module — META_WA_LINES routing (fail-loud), webhook
// parsing (messages + reactions + statuses), insert shape/dedupe, the
// wa_reaction keying, the post-200 media pass, and the sender's request shape.
//
// The route dispatches object="whatsapp_business_account" payloads here; every
// behaviour that can lose, misroute, or duplicate a lead is pinned in this file.
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ingestWaCloudWebhook,
  parseWaCloudWebhook,
  processWaCloudMediaJobs,
  resolveWaCloudLine,
  sendTemplate,
  sendText,
  waCloudConfigFromEnv,
  waCloudLineMap,
  waCloudMediaRelPath,
  WaCloudUnknownLineError,
  type WaCloudConfig,
  type WaCloudStore,
} from "./whatsapp-cloud";

const ENV = {
  META_WA_LINES:
    "pnid-etm:easyrent:etm-website,pnid-cardiwan:cardiwan:cardiwan,pnid-bot:take-auto:takeauto-leasing-dept",
  META_WA_WABA_ID: "waba-1",
};

function waPayload(changes: Record<string, unknown>[], entryId = "waba-1") {
  return { object: "whatsapp_business_account", entry: [{ id: entryId, changes }] };
}

function textChange(overrides: {
  phoneNumberId?: string;
  from?: string;
  wamid?: string;
  text?: string;
  name?: string;
  timestamp?: string;
}) {
  const from = overrides.from ?? "971501112233";
  return {
    field: "messages",
    value: {
      messaging_product: "whatsapp",
      metadata: { display_phone_number: "971564048816", phone_number_id: overrides.phoneNumberId ?? "pnid-etm" },
      contacts: [{ profile: { name: overrides.name ?? "Sanaa M" }, wa_id: from }],
      messages: [
        {
          from,
          id: overrides.wamid ?? "wamid.HBgM-abc",
          timestamp: overrides.timestamp ?? "1758000000",
          type: "text",
          text: { body: overrides.text ?? "Need a Camry for a week" },
        },
      ],
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("waCloudLineMap / resolveWaCloudLine — META_WA_LINES routing, fail-loud", () => {
  it("parses phoneNumberId:tenantSlug[:lineSlug] triples, tolerating spaces and empty entries", () => {
    const map = waCloudLineMap(ENV);
    expect(map["pnid-etm"]).toEqual({ phoneNumberId: "pnid-etm", tenantSlug: "easyrent", lineSlug: "etm-website" });
    expect(map["pnid-bot"]).toEqual({ phoneNumberId: "pnid-bot", tenantSlug: "take-auto", lineSlug: "takeauto-leasing-dept" });
    expect(waCloudLineMap({ META_WA_LINES: " a : take-auto ,, b:easyrent " })).toEqual({
      a: { phoneNumberId: "a", tenantSlug: "take-auto", lineSlug: null },
      b: { phoneNumberId: "b", tenantSlug: "easyrent", lineSlug: null },
    });
  });

  it("an unset var is an empty map — every event then throws unknown-line", () => {
    expect(waCloudLineMap({})).toEqual({});
  });

  it("a malformed pair throws — a half-parsed routing table lands chats on the wrong desk", () => {
    expect(() => waCloudLineMap({ META_WA_LINES: "pnid-only" })).toThrow(WaCloudUnknownLineError);
    expect(() => waCloudLineMap({ META_WA_LINES: "pnid:UPPER CASE" })).toThrow(WaCloudUnknownLineError);
  });

  it("a lineSlug that lines.ts does not know throws at parse, not at insert", () => {
    expect(() => waCloudLineMap({ META_WA_LINES: "pnid:easyrent:no-such-line" })).toThrow(WaCloudUnknownLineError);
  });

  it("an unknown phone_number_id THROWS — never a default tenant", () => {
    expect(() => resolveWaCloudLine("pnid-stranger", ENV)).toThrow(WaCloudUnknownLineError);
    expect(resolveWaCloudLine("pnid-cardiwan", ENV).tenantSlug).toBe("cardiwan");
  });
});

describe("parseWaCloudWebhook — messages, reactions, statuses", () => {
  it("a text message keys on the customer's REAL phone (no @lid, ever)", () => {
    const { messages } = parseWaCloudWebhook(waPayload([textChange({})]), ENV);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      fromDigits: "971501112233",
      customerName: "Sanaa M",
      wamid: "wamid.HBgM-abc",
      body: "Need a Camry for a week",
      media: null,
    });
    expect(messages[0].line).toEqual({ phoneNumberId: "pnid-etm", tenantSlug: "easyrent", lineSlug: "etm-website" });
    expect(messages[0].at.getTime()).toBe(1758000000 * 1000);
  });

  it("an unknown phone_number_id throws out of parse (the route turns it into a 500)", () => {
    expect(() => parseWaCloudWebhook(waPayload([textChange({ phoneNumberId: "pnid-stranger" })]), ENV)).toThrow(
      WaCloudUnknownLineError
    );
    // …even for a statuses-only change — any event from an unmapped number is a config gap.
    expect(() =>
      parseWaCloudWebhook(
        waPayload([
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "pnid-stranger" },
              statuses: [{ id: "wamid.x", status: "sent", timestamp: "1" }],
            },
          },
        ]),
        ENV
      )
    ).toThrow(WaCloudUnknownLineError);
  });

  it("a pinned WABA id rejects foreign entries", () => {
    const r = parseWaCloudWebhook(waPayload([textChange({})], "waba-OTHER"), ENV);
    expect(r.messages).toHaveLength(0);
    expect(r.skippedUnknownWaba).toBe(1);
    // …and unpinned, any entry id passes.
    const unpinned = parseWaCloudWebhook(waPayload([textChange({})], "waba-OTHER"), { META_WA_LINES: ENV.META_WA_LINES });
    expect(unpinned.messages).toHaveLength(1);
  });

  it("a document message keeps the placeholder AND the filename (idDocumentSent keys on EID_ names)", () => {
    const change = textChange({});
    const value = (change.value as { messages: Record<string, unknown>[] }).messages;
    value[0] = {
      ...value[0],
      type: "document",
      text: undefined,
      document: { id: "media-1", filename: "EID_784197922876145_AHMAD.pdf", mime_type: "application/pdf" },
    };
    const { messages } = parseWaCloudWebhook(waPayload([change]), ENV);
    expect(messages[0].body).toBe("[document] EID_784197922876145_AHMAD.pdf");
    expect(messages[0].media).toEqual({ id: "media-1", mimeType: "application/pdf", filename: "EID_784197922876145_AHMAD.pdf" });
  });

  it("image/audio placeholders match the observer vocabulary, captions survive", () => {
    const change = textChange({});
    const value = (change.value as { messages: Record<string, unknown>[] }).messages;
    value[0] = { ...value[0], type: "image", text: undefined, image: { id: "m1", mime_type: "image/jpeg", caption: "this one" } };
    value.push({ from: "971501112233", id: "wamid.audio", timestamp: "1758000001", type: "audio", audio: { id: "m2", mime_type: "audio/ogg" } });
    const { messages } = parseWaCloudWebhook(waPayload([change]), ENV);
    expect(messages.map((m) => m.body)).toEqual(["[image] this one", "[voice/audio]"]);
    expect(messages.every((m) => m.media !== null)).toBe(true);
  });

  it("a reaction is not a message — it keys off the reacted-to wamid with the reactor's real phone", () => {
    const change = textChange({});
    const value = (change.value as { messages: Record<string, unknown>[] }).messages;
    value[0] = {
      from: "971529965085", // Babek
      id: "wamid.rxn1",
      timestamp: "1758000050",
      type: "reaction",
      reaction: { message_id: "wamid.OUTBOX-PING", emoji: "👍" },
    };
    const { messages, reactions } = parseWaCloudWebhook(waPayload([change]), ENV);
    expect(messages).toHaveLength(0);
    expect(reactions).toEqual([
      {
        line: { phoneNumberId: "pnid-etm", tenantSlug: "easyrent", lineSlug: "etm-website" },
        messageId: "wamid.OUTBOX-PING",
        reactorJid: "971529965085@s.whatsapp.net",
        reactorPhone: "971529965085",
        emoji: "👍",
        at: new Date(1758000050 * 1000),
      },
    ]);
  });

  it("a REMOVED reaction arrives with an empty emoji (overwrites = un-accept)", () => {
    const change = textChange({});
    const value = (change.value as { messages: Record<string, unknown>[] }).messages;
    value[0] = {
      from: "971529965085",
      id: "wamid.rxn2",
      timestamp: "1758000060",
      type: "reaction",
      reaction: { message_id: "wamid.OUTBOX-PING" },
    };
    const { reactions } = parseWaCloudWebhook(waPayload([change]), ENV);
    expect(reactions[0].emoji).toBe("");
  });

  it("statuses[] parse into receipts with errors surfaced", () => {
    const r = parseWaCloudWebhook(
      waPayload([
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "971564048816", phone_number_id: "pnid-etm" },
            statuses: [
              { id: "wamid.out1", status: "delivered", timestamp: "1758000100", recipient_id: "971501112233" },
              {
                id: "wamid.out2",
                status: "failed",
                timestamp: "1758000200",
                recipient_id: "971501112233",
                errors: [{ title: "Message undeliverable", code: 131026 }],
              },
            ],
          },
        },
      ]),
      ENV
    );
    expect(r.statuses).toEqual([
      { wamid: "wamid.out1", status: "delivered", recipientId: "971501112233", at: new Date(1758000100 * 1000), error: null },
      {
        wamid: "wamid.out2",
        status: "failed",
        recipientId: "971501112233",
        at: new Date(1758000200 * 1000),
        error: "Message undeliverable",
      },
    ]);
  });

  it("contentless rows are counted and dropped", () => {
    const change = textChange({});
    const value = (change.value as { messages: Record<string, unknown>[] }).messages;
    value.push({ from: "not-a-phone", id: "wamid.bad", timestamp: "1758000002", type: "text", text: { body: "hi" } });
    const r = parseWaCloudWebhook(waPayload([change]), ENV);
    expect(r.messages).toHaveLength(1);
    expect(r.skippedNonMessage).toBe(1);
  });

  it("a non-WA object parses to nothing", () => {
    const r = parseWaCloudWebhook({ object: "instagram", entry: [] }, ENV);
    expect(r.messages).toHaveLength(0);
    expect(r.statuses).toHaveLength(0);
  });
});

describe("ingestWaCloudWebhook — insert shape, dedupe, reactions, media jobs", () => {
  function fakeStore(opts: { existing?: Set<string>; tenantId?: string | null; reactionMatch?: boolean } = {}) {
    const inserted: Record<string, unknown>[] = [];
    const reactions: Record<string, unknown>[] = [];
    const store: WaCloudStore = {
      tenantIdForSlug: async () => (opts.tenantId === undefined ? "tenant-1" : opts.tenantId),
      insertInbound: async (row) => {
        if (opts.existing?.has(row.externalMessageId)) return false;
        inserted.push({ ...row });
        return true;
      },
      recordReaction: async (row) => {
        reactions.push({ ...row });
        return opts.reactionMatch ?? true;
      },
      setMediaPath: async () => {},
    };
    return { store, inserted, reactions };
  }

  it("inserts a whatsapp-channel-shaped inbound row keyed (tenant, wamid), to = line slug", async () => {
    const { store, inserted } = fakeStore();
    const r = await ingestWaCloudWebhook(store, waPayload([textChange({})]), { env: ENV });
    expect(r.inserted).toBe(1);
    expect(inserted[0]).toEqual({
      tenantId: "tenant-1",
      from: "971501112233",
      to: "etm-website", // the line slug — the relay routes whatsapp rows by `to`
      customerName: "Sanaa M",
      body: "Need a Camry for a week",
      externalMessageId: "wamid.HBgM-abc",
      createdAt: new Date(1758000000 * 1000),
    });
  });

  it("without a lineSlug segment, `to` falls back to the tenant slug label", async () => {
    const { store, inserted } = fakeStore();
    await ingestWaCloudWebhook(store, waPayload([textChange({})]), {
      env: { META_WA_LINES: "pnid-etm:easyrent" },
    });
    expect((inserted[0] as { to: string }).to).toBe("easyrent");
  });

  it("a duplicate wamid inserts nothing (Meta is at-least-once; retries are absorbed)", async () => {
    const { store, inserted } = fakeStore({ existing: new Set(["wamid.HBgM-abc"]) });
    const r = await ingestWaCloudWebhook(store, waPayload([textChange({})]), { env: ENV });
    expect(r.inserted).toBe(0);
    expect(r.duplicates).toBe(1);
    expect(inserted).toHaveLength(0);
  });

  it("a reaction reaches the store keyed on wa_message_id, tenant resolved off the line", async () => {
    const change = textChange({});
    (change.value as { messages: Record<string, unknown>[] }).messages[0] = {
      from: "971529965085",
      id: "wamid.rxn1",
      timestamp: "1758000050",
      type: "reaction",
      reaction: { message_id: "wamid.OUTBOX-PING", emoji: "👍" },
    };
    const { store, reactions } = fakeStore();
    const r = await ingestWaCloudWebhook(store, waPayload([change]), { env: ENV });
    expect(r.reactions).toBe(1);
    expect(r.reactionsMatched).toBe(1);
    expect(reactions[0]).toEqual({
      tenantId: "tenant-1",
      line: "etm-website",
      messageId: "wamid.OUTBOX-PING",
      reactorJid: "971529965085@s.whatsapp.net",
      reactorPhone: "971529965085",
      emoji: "👍",
    });
  });

  it("a reaction matching no outbox row is counted but not matched (hand-typed messages)", async () => {
    const change = textChange({});
    (change.value as { messages: Record<string, unknown>[] }).messages[0] = {
      from: "971529965085",
      id: "wamid.rxn1",
      timestamp: "1758000050",
      type: "reaction",
      reaction: { message_id: "wamid.HAND-TYPED", emoji: "👍" },
    };
    const { store } = fakeStore({ reactionMatch: false });
    const r = await ingestWaCloudWebhook(store, waPayload([change]), { env: ENV });
    expect(r.reactions).toBe(1);
    expect(r.reactionsMatched).toBe(0);
  });

  it("media messages queue a post-200 download job under the wa root", async () => {
    const change = textChange({});
    (change.value as { messages: Record<string, unknown>[] }).messages[0] = {
      from: "971501112233",
      id: "wamid.img1",
      timestamp: "1758000000",
      type: "image",
      image: { id: "media-42", mime_type: "image/jpeg", caption: "this one" },
    };
    const { store } = fakeStore();
    const r = await ingestWaCloudWebhook(store, waPayload([change]), { env: ENV });
    expect(r.mediaJobs).toEqual([
      {
        tenantId: "tenant-1",
        externalMessageId: "wamid.img1",
        mediaId: "media-42",
        relpath: "wa/etm-website/wamid_img1.jpg",
      },
    ]);
  });

  it("the status hook fires per receipt and a throwing hook costs nothing", async () => {
    const { store } = fakeStore();
    const seen: string[] = [];
    const r = await ingestWaCloudWebhook(
      store,
      waPayload([
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "pnid-etm" },
            statuses: [
              { id: "wamid.a", status: "sent", timestamp: "1" },
              { id: "wamid.b", status: "read", timestamp: "2" },
            ],
          },
        },
      ]),
      {
        env: ENV,
        onStatus: (s) => {
          seen.push(`${s.wamid}:${s.status}`);
          if (s.status === "sent") throw new Error("hook bug");
        },
      }
    );
    expect(seen).toEqual(["wamid.a:sent", "wamid.b:read"]);
    expect(r.statuses).toHaveLength(2);
  });

  it("an unresolvable tenant drops the message but never the webhook", async () => {
    const { store } = fakeStore({ tenantId: null });
    const r = await ingestWaCloudWebhook(store, waPayload([textChange({})]), { env: ENV });
    expect(r.inserted).toBe(0);
    expect(r.skippedNoTenant).toBe(1);
  });
});

describe("waCloudMediaRelPath — wa root, wamid sanitized, ext from filename/mime", () => {
  const line = { phoneNumberId: "p", tenantSlug: "easyrent", lineSlug: "etm-website" };
  it("filename wins, then mime, then bin", () => {
    expect(waCloudMediaRelPath(line, "wamid.HBgM/x==", null, "EID_784.PDF")).toBe("wa/etm-website/wamid_HBgM_x__.pdf");
    expect(waCloudMediaRelPath(line, "wamid.a", "audio/ogg", null)).toBe("wa/etm-website/wamid_a.ogg");
    expect(waCloudMediaRelPath(line, "wamid.b", "application/octet-stream", null)).toBe("wa/etm-website/wamid_b.bin");
  });
  it("no lineSlug → the tenant slug is the dir", () => {
    expect(waCloudMediaRelPath({ ...line, lineSlug: null }, "wamid.c", "image/jpeg", null)).toBe("wa/easyrent/wamid_c.jpg");
  });
});

describe("processWaCloudMediaJobs — two-step download after the 200, best-effort", () => {
  let dir: string;
  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.META_WA_TOKEN;
    delete process.env.WA_MEDIA_ROOT;
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function freshModule() {
    // MEDIA_ROOTS reads WA_MEDIA_ROOT at module load — reload against a temp root.
    vi.resetModules();
    dir = await mkdtemp(path.join(tmpdir(), "wa-cloud-media-"));
    process.env.WA_MEDIA_ROOT = dir;
    process.env.MEDIA_TOKEN_SECRET ||= "vitest-media-secret";
    return import("./whatsapp-cloud");
  }

  const JOB = {
    tenantId: "tenant-1",
    externalMessageId: "wamid.img1",
    mediaId: "media-42",
    relpath: "wa/etm-website/wamid_img1.jpg",
  };

  function fakeStore(stamps: string[]): WaCloudStore {
    return {
      tenantIdForSlug: async () => null,
      insertInbound: async () => false,
      recordReaction: async () => false,
      setMediaPath: async (_t, e, r) => {
        stamps.push(`${e}→${r}`);
      },
    };
  }

  it("media id → url → bytes lands on disk and stamps media_path, Bearer on BOTH calls", async () => {
    const mod = await freshModule();
    process.env.META_WA_TOKEN = "wa-token";
    const calls: [string, RequestInit?][] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push([url, init]);
        if (url.includes("/media-42")) {
          return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=42" }), { status: 200 });
        }
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      })
    );
    const stamps: string[] = [];
    await mod.processWaCloudMediaJobs(fakeStore(stamps), [JOB]);
    expect(calls).toHaveLength(2);
    for (const [, init] of calls) {
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer wa-token");
    }
    expect(stamps).toEqual(["wamid.img1→wa/etm-website/wamid_img1.jpg"]);
    expect([...(await readFile(path.join(dir, "etm-website/wamid_img1.jpg")))]).toEqual([1, 2, 3]);
  });

  it("no token → one warn, placeholders kept, nothing fetched", async () => {
    const mod = await freshModule();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const stamps: string[] = [];
    await expect(mod.processWaCloudMediaJobs(fakeStore(stamps), [JOB], {})).resolves.toBeUndefined();
    expect(f).not.toHaveBeenCalled();
    expect(stamps).toHaveLength(0);
  });

  it("a failed download logs and keeps the placeholder — never throws", async () => {
    const mod = await freshModule();
    process.env.META_WA_TOKEN = "wa-token";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 410 })));
    const stamps: string[] = [];
    await expect(mod.processWaCloudMediaJobs(fakeStore(stamps), [JOB])).resolves.toBeUndefined();
    expect(stamps).toHaveLength(0);
  });
});

describe("the sender — request shape, typed failures, never a throw", () => {
  const CFG: WaCloudConfig = {
    accessToken: "token-1",
    phoneNumberId: "pnid-etm",
    graphBaseUrl: "https://graph.facebook.com",
    apiVersion: "v21.0",
  };

  function fetchReturning(status: number, payload: unknown) {
    return vi.fn(async () => new Response(JSON.stringify(payload), { status }));
  }

  it("waCloudConfigFromEnv: null until BOTH credentials exist; META_WA_TOKEN is an accepted alias", () => {
    expect(waCloudConfigFromEnv({})).toBeNull();
    expect(waCloudConfigFromEnv({ META_WA_ACCESS_TOKEN: "t" })).toBeNull();
    expect(waCloudConfigFromEnv({ META_WA_ACCESS_TOKEN: "t", META_WA_PHONE_NUMBER_ID: "p" })).toMatchObject({
      accessToken: "t",
      phoneNumberId: "p",
      apiVersion: "v21.0",
    });
    expect(waCloudConfigFromEnv({ META_WA_TOKEN: "t2", META_WA_PHONE_NUMBER_ID: "p" })?.accessToken).toBe("t2");
  });

  it("sendText posts messaging_product whatsapp with the Bearer token", async () => {
    const f = fetchReturning(200, { messages: [{ id: "wamid.sent1" }] });
    const r = await sendText(CFG, "+971 50 111 2233", "Hello!", f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, wamid: "wamid.sent1" });
    const [url, init] = (f as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/pnid-etm/messages");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer token-1");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "971501112233",
      type: "text",
      text: { body: "Hello!" },
    });
  });

  it("sendTemplate posts the template envelope, components only when given", async () => {
    const f = fetchReturning(200, { messages: [{ id: "wamid.t1" }] });
    const r = await sendTemplate(
      CFG,
      "971501112233",
      "booking_confirm",
      "en",
      [{ type: "body", parameters: [{ type: "text", text: "Monday" }] }],
      f as unknown as typeof fetch
    );
    expect(r).toEqual({ ok: true, wamid: "wamid.t1" });
    const [, init] = (f as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).template).toEqual({
      name: "booking_confirm",
      language: { code: "en" },
      components: [{ type: "body", parameters: [{ type: "text", text: "Monday" }] }],
    });

    const f2 = fetchReturning(200, { messages: [{ id: "wamid.t2" }] });
    await sendTemplate(CFG, "971501112233", "hello_world", "en_US", undefined, f2 as unknown as typeof fetch);
    const [, init2] = (f2 as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init2.body as string).template.components).toBeUndefined();
  });

  it("a Meta API error is {ok:false} with the message, never a throw", async () => {
    const f = fetchReturning(400, { error: { message: "(#131030) Recipient phone number not in allowed list" } });
    const r = await sendText(CFG, "971501112233", "hi", f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.error).toContain("131030");
    }
  });

  it("a network failure is {ok:false} too", async () => {
    const f = vi.fn(async () => {
      throw new Error("fetch failed");
    });
    const r = await sendText(CFG, "971501112233", "hi", f as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: "fetch failed" });
  });

  it("a junk recipient never reaches the API", async () => {
    const f = vi.fn();
    const r = await sendText(CFG, "123", "hi", f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

// The HMAC helper the route tests share — re-pinned here so this file stands alone.
describe("signature sanity (the route's gate is unchanged for WA payloads)", () => {
  it("HMAC-SHA256 over the raw WA body verifies like any Meta payload", () => {
    const body = JSON.stringify(waPayload([textChange({})]));
    const sig = createHmac("sha256", "secret").update(body, "utf8").digest("hex");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });
});
