// The Meta webhook module — signature, parsing, insert shape, media tolerance.
//
// The route (app/api/webhooks/meta/route.ts) is a thin shell over this; every
// behaviour that can lose or duplicate a lead is pinned here.
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ingestMetaWebhook,
  metaAccountFor,
  metaExternalMessageId,
  metaFromValue,
  metaMediaRelPath,
  metaMessageBody,
  parseMetaWebhook,
  processMetaMediaJobs,
  verifyMetaSignature,
  type MetaInboundMessage,
  type MetaWebhookStore,
} from "./webhook";

const SECRET = "meta-app-secret";

function sign(body: string, secret: string = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

function igPayload(messages: Record<string, unknown>[], object = "instagram") {
  return {
    object,
    entry: [
      {
        id: "our-account",
        messaging: messages.map((m) => ({
          sender: { id: "17841400123456789" },
          recipient: { id: "900123456789" },
          timestamp: 1758000000000,
          ...m,
        })),
      },
    ],
  };
}

describe("verifyMetaSignature — HMAC of the raw body, no downgrade", () => {
  const BODY = '{"object":"instagram","entry":[]}';

  it("accepts a correctly signed body", () => {
    expect(verifyMetaSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(verifyMetaSignature(BODY, sign(BODY, "other"), SECRET)).toBe(false);
  });

  it("rejects a missing header and a malformed one", () => {
    expect(verifyMetaSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, "sha256=not-hex", SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, sign(BODY).slice(0, -2) + "zz", SECRET)).toBe(false);
  });

  it("signs the RAW body — a re-serialized payload fails", () => {
    const pretty = JSON.stringify(JSON.parse(BODY), null, 2);
    expect(verifyMetaSignature(pretty, sign(BODY), SECRET)).toBe(false);
  });
});

describe("parseMetaWebhook — the envelope down to real inbound messages", () => {
  it("an instagram object yields instagram-channel messages", () => {
    const { messages } = parseMetaWebhook(igPayload([{ message: { mid: "m1", text: "hi, car for a week?" } }]));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      channel: "instagram",
      senderScopedId: "17841400123456789",
      mid: "m1",
      text: "hi, car for a week?",
    });
    expect(messages[0].account).toEqual({ accountSlug: "ig-takeauto", tenantSlug: "take-auto" });
    expect(messages[0].at.getTime()).toBe(1758000000000);
  });

  it("a page object yields messenger-channel messages on the fb account slug", () => {
    const { messages } = parseMetaWebhook(igPayload([{ message: { mid: "m1", text: "hello" } }], "page"));
    expect(messages[0].channel).toBe("messenger");
    expect(messages[0].account.accountSlug).toBe("fb-takeauto");
  });

  it("echoes of our own replies are counted and dropped", () => {
    const r = parseMetaWebhook(igPayload([{ message: { mid: "m1", text: "our reply", is_echo: true } }]));
    expect(r.messages).toHaveLength(0);
    expect(r.skippedEcho).toBe(1);
  });

  it("delivery/read/reaction events are counted and dropped", () => {
    const r = parseMetaWebhook(
      igPayload([
        { delivery: { mids: ["m1"], watermark: 1 } },
        { read: { watermark: 1 } },
        { reaction: { mid: "m1", action: "react", reaction: "love" } },
      ])
    );
    expect(r.messages).toHaveLength(0);
    expect(r.skippedNonMessage).toBe(3);
  });

  it("an attachment-only message survives with its placeholder(s)", () => {
    const { messages } = parseMetaWebhook(
      igPayload([
        {
          message: {
            mid: "m2",
            attachments: [
              { type: "image", payload: { url: "https://cdn.fbsbx.com/v/photo.jpg?ccb=1" } },
              { type: "file", payload: { url: "https://cdn.fbsbx.com/v/doc.pdf" } },
            ],
          },
        },
      ])
    );
    expect(messages).toHaveLength(1);
    expect(metaMessageBody(messages[0])).toBe("[image] [file]");
  });

  it("text AND attachments keep both", () => {
    const { messages } = parseMetaWebhook(
      igPayload([
        {
          message: {
            mid: "m3",
            text: "this one please",
            attachments: [{ type: "image", payload: { url: "https://cdn.fbsbx.com/x.png" } }],
          },
        },
      ])
    );
    expect(metaMessageBody(messages[0])).toBe("this one please [image]");
  });

  it("a contentless event (like with no text or attachment) is dropped", () => {
    const r = parseMetaWebhook(igPayload([{ message: { mid: "m4" } }]));
    expect(r.messages).toHaveLength(0);
    expect(r.skippedNonMessage).toBe(1);
  });
});

describe("metaAccountFor — one account until a second is configured", () => {
  afterEach(() => {
    delete process.env.META_IG_ACCOUNT_ID;
  });

  it("unpinned: any recipient falls through to the single v1 account", () => {
    expect(metaAccountFor("instagram", "anything")).toEqual({ accountSlug: "ig-takeauto", tenantSlug: "take-auto" });
    expect(metaAccountFor("page", "anything")).toEqual({ accountSlug: "fb-takeauto", tenantSlug: "take-auto" });
  });

  it("a pinned env id accepts only that account", () => {
    process.env.META_IG_ACCOUNT_ID = "900123456789";
    expect(metaAccountFor("instagram", "900123456789")?.accountSlug).toBe("ig-takeauto");
    expect(metaAccountFor("instagram", "someone-else")).toBeNull();
  });

  it("an unknown object type resolves to nothing", () => {
    expect(metaAccountFor("whatsapp", "x")).toBeNull();
  });
});

describe("identity helpers — the prefixes that keep scoped ids out of phone paths", () => {
  it("from carries the ig:/fb: prefix (pure-digit scoped ids are not phones)", () => {
    expect(metaFromValue("instagram", "17841400123456789")).toBe("ig:17841400123456789");
    expect(metaFromValue("messenger", "23958001")).toBe("fb:23958001");
  });

  it("external_message_id namespaces per channel and account", () => {
    expect(metaExternalMessageId("instagram", "ig-takeauto", "m1")).toBe("igmsg:ig-takeauto:m1");
    expect(metaExternalMessageId("messenger", "fb-takeauto", "m1")).toBe("fbmsg:fb-takeauto:m1");
  });

  it("media relpaths sit under the ig root, mid sanitized", () => {
    expect(metaMediaRelPath("ig-takeauto", "aWdf/xyz==", 0, "https://cdn.fbsbx.com/v/p.JPEG?ccb=1")).toBe(
      "ig/ig-takeauto/aWdf_xyz__-0.jpeg"
    );
    expect(metaMediaRelPath("fb-takeauto", "m1", 1, "not a url")).toBe("ig/fb-takeauto/m1-1.bin");
  });
});

describe("ingestMetaWebhook — insert shape and dedupe", () => {
  function fakeStore(opts: { existing?: Set<string>; tenantId?: string | null } = {}) {
    const inserted: Record<string, unknown>[] = [];
    const mediaStamps: string[] = [];
    const store: MetaWebhookStore = {
      tenantIdForSlug: async () => (opts.tenantId === undefined ? "tenant-1" : opts.tenantId),
      insertInbound: async (row) => {
        if (opts.existing?.has(row.externalMessageId)) return false;
        inserted.push({ ...row });
        return true;
      },
      setMediaPath: async (_tid, extId, rel) => {
        mediaStamps.push(`${extId}→${rel}`);
      },
    };
    return { store, inserted, mediaStamps };
  }

  it("inserts one inbound row per message, keyed (tenant, igmsg:<slug>:<mid>)", async () => {
    const { store, inserted } = fakeStore();
    const r = await ingestMetaWebhook(
      store,
      igPayload([{ message: { mid: "m1", text: "Need a Camry for a week" } }])
    );
    expect(r.inserted).toBe(1);
    expect(inserted[0]).toEqual({
      tenantId: "tenant-1",
      channel: "instagram",
      from: "ig:17841400123456789",
      to: "ig-takeauto",
      body: "Need a Camry for a week",
      externalMessageId: "igmsg:ig-takeauto:m1",
      createdAt: new Date(1758000000000),
    });
  });

  it("a duplicate mid inserts nothing (Meta retries are absorbed)", async () => {
    const { store, inserted } = fakeStore({ existing: new Set(["igmsg:ig-takeauto:m1"]) });
    const r = await ingestMetaWebhook(store, igPayload([{ message: { mid: "m1", text: "hi" } }]));
    expect(r.inserted).toBe(0);
    expect(r.duplicates).toBe(1);
    expect(inserted).toHaveLength(0);
    // …and a duplicate queues no media work either.
    expect(r.mediaJobs).toHaveLength(0);
  });

  it("attachments become media jobs for the post-response pass", async () => {
    const { store } = fakeStore();
    const r = await ingestMetaWebhook(
      store,
      igPayload([
        { message: { mid: "m9", attachments: [{ type: "image", payload: { url: "https://cdn.fbsbx.com/p.jpg" } }] } },
      ])
    );
    expect(r.mediaJobs).toEqual([
      {
        tenantId: "tenant-1",
        externalMessageId: "igmsg:ig-takeauto:m9",
        url: "https://cdn.fbsbx.com/p.jpg",
        relpath: "ig/ig-takeauto/m9-0.jpg",
      },
    ]);
  });

  it("an unresolvable tenant drops the message but never the webhook", async () => {
    const { store } = fakeStore({ tenantId: null });
    const r = await ingestMetaWebhook(store, igPayload([{ message: { mid: "m1", text: "hi" } }]));
    expect(r.inserted).toBe(0);
    expect(r.skippedNoTenant).toBe(1);
  });
});

describe("processMetaMediaJobs — best-effort, placeholder survives a failure", () => {
  let dir: string;
  afterEach(async () => {
    vi.unstubAllGlobals();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function freshModule() {
    // MEDIA_ROOTS reads IG_MEDIA_ROOT at module load — reload both modules
    // against the temp root.
    vi.resetModules();
    dir = await mkdtemp(path.join(tmpdir(), "ig-media-"));
    process.env.IG_MEDIA_ROOT = dir;
    process.env.MEDIA_TOKEN_SECRET ||= "vitest-media-secret";
    return import("./webhook");
  }

  const JOB: Parameters<typeof processMetaMediaJobs>[1][number] = {
    tenantId: "tenant-1",
    externalMessageId: "igmsg:ig-takeauto:m9",
    url: "https://cdn.fbsbx.com/p.jpg",
    relpath: "ig/ig-takeauto/m9-0.jpg",
  };

  it("a good download lands on disk and stamps media_path", async () => {
    const mod = await freshModule();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })));
    const stamps: string[] = [];
    await mod.processMetaMediaJobs(
      { tenantIdForSlug: async () => null, insertInbound: async () => false, setMediaPath: async (_t, e, r) => void stamps.push(`${e}→${r}`) },
      [JOB]
    );
    expect(stamps).toEqual(["igmsg:ig-takeauto:m9→ig/ig-takeauto/m9-0.jpg"]);
    expect([...(await readFile(path.join(dir, "ig-takeauto/m9-0.jpg")))]).toEqual([1, 2, 3]);
  });

  it("a failed download logs and keeps the placeholder — never throws", async () => {
    const mod = await freshModule();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch failed");
    }));
    const stamps: string[] = [];
    await expect(
      mod.processMetaMediaJobs(
        { tenantIdForSlug: async () => null, insertInbound: async () => false, setMediaPath: async () => void stamps.push("x") },
        [JOB]
      )
    ).resolves.toBeUndefined();
    expect(stamps).toHaveLength(0);
  });

  it("an HTTP error from the CDN is a failure too", async () => {
    const mod = await freshModule();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 410 })));
    const stamps: string[] = [];
    await mod.processMetaMediaJobs(
      { tenantIdForSlug: async () => null, insertInbound: async () => false, setMediaPath: async () => void stamps.push("x") },
      [JOB]
    );
    expect(stamps).toHaveLength(0);
  });
});
