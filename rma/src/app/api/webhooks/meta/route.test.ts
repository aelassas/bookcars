// Route-level wiring: the GET handshake, the signature gate, and the 200-fast
// contract (rows in, media after the response). The heavy behaviour lives in
// integrations/meta/webhook.test.ts — here we pin the HTTP contract Meta sees.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ingest, processMedia, ingestWa, processWaMedia } = vi.hoisted(() => ({
  ingest: vi.fn(),
  processMedia: vi.fn(async () => {}),
  ingestWa: vi.fn(),
  processWaMedia: vi.fn(async () => {}),
}));

vi.mock("@/platform/db/client", () => ({ db: {} }));
vi.mock("@/platform/integrations/meta/webhook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/integrations/meta/webhook")>();
  return {
    ...actual,
    createDrizzleMetaStore: () => ({}),
    ingestMetaWebhook: ingest as unknown as typeof actual.ingestMetaWebhook,
    processMetaMediaJobs: processMedia as unknown as typeof actual.processMetaMediaJobs,
  };
});
vi.mock("@/platform/integrations/meta/whatsapp-cloud", async (importOriginal) => {
  // importOriginal keeps WaCloudUnknownLineError's class identity intact, so
  // the route's instanceof catch sees the error the mock throws.
  const actual = await importOriginal<typeof import("@/platform/integrations/meta/whatsapp-cloud")>();
  return {
    ...actual,
    createDrizzleWaCloudStore: () => ({}),
    ingestWaCloudWebhook: ingestWa as unknown as typeof actual.ingestWaCloudWebhook,
    processWaCloudMediaJobs: processWaMedia as unknown as typeof actual.processWaCloudMediaJobs,
  };
});

import { GET, POST } from "./route";

const SECRET = "meta-app-secret";
const TOKEN = "meta-verify-token";

function signedRequest(body: string, secret: string = SECRET): Request {
  const sig = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
  return new Request("https://mycrm.local/api/webhooks/meta", {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": sig },
    body,
  });
}

beforeEach(() => {
  process.env.META_WEBHOOK_VERIFY_TOKEN = TOKEN;
  process.env.META_APP_SECRET = SECRET;
  ingest.mockReset();
  processMedia.mockClear();
  ingestWa.mockReset();
  processWaMedia.mockClear();
  ingestWa.mockResolvedValue({
    received: 1,
    inserted: 1,
    duplicates: 0,
    reactions: 1,
    reactionsMatched: 1,
    statuses: [{ wamid: "wamid.x", status: "sent", recipientId: "9715", at: new Date(0), error: null }],
    skippedNonMessage: 0,
    skippedUnknownWaba: 0,
    skippedNoTenant: 0,
    mediaJobs: [],
  });
  ingest.mockResolvedValue({
    received: 1,
    inserted: 1,
    duplicates: 0,
    skippedEcho: 0,
    skippedNonMessage: 0,
    skippedUnknownAccount: 0,
    skippedNoTenant: 0,
    mediaJobs: [],
  });
});

afterEach(() => {
  delete process.env.META_WEBHOOK_VERIFY_TOKEN;
  delete process.env.META_APP_SECRET;
});

describe("GET — the verification handshake", () => {
  it("echoes hub.challenge when mode and token match", async () => {
    const res = await GET(
      new Request(
        `https://mycrm.local/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=challenge-abc`
      )
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("challenge-abc");
  });

  it("403 on a wrong token", async () => {
    const res = await GET(
      new Request(
        "https://mycrm.local/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x"
      )
    );
    expect(res.status).toBe(403);
  });

  it("500 (never a silent accept) when the verify token is not configured", async () => {
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    const res = await GET(
      new Request(
        "https://mycrm.local/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=x&hub.challenge=x"
      )
    );
    expect(res.status).toBe(500);
  });
});

describe("POST — signature gate and fast 200", () => {
  const BODY = JSON.stringify({
    object: "instagram",
    entry: [{ messaging: [{ sender: { id: "1" }, recipient: { id: "2" }, timestamp: 1, message: { mid: "m1", text: "hi" } }] }],
  });

  it("a bad signature is a 401", async () => {
    const res = await POST(signedRequest(BODY, "wrong-secret"));
    expect(res.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("a missing signature header is a 401", async () => {
    const res = await POST(
      new Request("https://mycrm.local/api/webhooks/meta", { method: "POST", body: BODY })
    );
    expect(res.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("500 (never a silent accept) when META_APP_SECRET is not configured", async () => {
    delete process.env.META_APP_SECRET;
    const res = await POST(signedRequest(BODY));
    expect(res.status).toBe(500);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("a valid payload ingests and answers 200 with the counts", async () => {
    const res = await POST(signedRequest(BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, received: 1, inserted: 1 });
    expect(json.mediaJobs).toBeUndefined(); // internal detail, not for Meta
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(processMedia).not.toHaveBeenCalled(); // no attachments → no media pass
  });

  it("media jobs run after the response, and a media failure stays invisible to Meta", async () => {
    ingest.mockResolvedValue({
      received: 1, inserted: 1, duplicates: 0, skippedEcho: 0, skippedNonMessage: 0,
      skippedUnknownAccount: 0, skippedNoTenant: 0,
      mediaJobs: [{ tenantId: "t", externalMessageId: "e", url: "u", relpath: "r" }],
    });
    processMedia.mockRejectedValue(new Error("disk full"));
    const res = await POST(signedRequest(BODY));
    expect(res.status).toBe(200);
    // The fire-and-forget pass settles without an unhandled rejection.
    await new Promise((r) => setImmediate(r));
    expect(processMedia).toHaveBeenCalledTimes(1);
  });

  it("an ingest failure is acknowledged 200 — Meta must not retry a data fault", async () => {
    ingest.mockRejectedValue(new Error("db down"));
    const res = await POST(signedRequest(BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(false);
  });
});

describe("POST — whatsapp_business_account payloads dispatch to the Cloud API ingest", () => {
  const WA_BODY = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { display_phone_number: "971564048816", phone_number_id: "pnid-etm" },
              contacts: [{ profile: { name: "Sanaa M" }, wa_id: "971501112233" }],
              messages: [
                { from: "971501112233", id: "wamid.HBgM-1", timestamp: "1758000000", type: "text", text: { body: "Camry for a week?" } },
              ],
            },
          },
        ],
      },
    ],
  });

  it("a signed WA payload goes to ingestWaCloudWebhook, never the IG/FB one", async () => {
    const res = await POST(signedRequest(WA_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, received: 1, inserted: 1, reactionsMatched: 1, statuses: 1 });
    expect(json.statuses).not.toBeInstanceOf(Array); // internal detail, not for Meta
    expect(json.mediaJobs).toBeUndefined();
    expect(ingestWa).toHaveBeenCalledTimes(1);
    expect(ingest).not.toHaveBeenCalled();
    expect(processWaMedia).not.toHaveBeenCalled(); // no media → no pass
  });

  it("an unknown phone_number_id is a 500 — misconfiguration fails loud, never defaults", async () => {
    const { WaCloudUnknownLineError } = await import("@/platform/integrations/meta/whatsapp-cloud");
    ingestWa.mockRejectedValue(new WaCloudUnknownLineError('unknown WhatsApp phone_number_id "pnid-x"'));
    const res = await POST(signedRequest(WA_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });

  it("WA media jobs run after the response, and a media failure stays invisible to Meta", async () => {
    ingestWa.mockResolvedValue({
      received: 1, inserted: 1, duplicates: 0, reactions: 0, reactionsMatched: 0,
      statuses: [], skippedNonMessage: 0, skippedUnknownWaba: 0, skippedNoTenant: 0,
      mediaJobs: [{ tenantId: "t", externalMessageId: "e", mediaId: "m", relpath: "wa/x/e.jpg" }],
    });
    processWaMedia.mockRejectedValue(new Error("disk full"));
    const res = await POST(signedRequest(WA_BODY));
    expect(res.status).toBe(200);
    await new Promise((r) => setImmediate(r));
    expect(processWaMedia).toHaveBeenCalledTimes(1);
  });

  it("the WA path is behind the same HMAC gate", async () => {
    const res = await POST(signedRequest(WA_BODY, "wrong-secret"));
    expect(res.status).toBe(401);
    expect(ingestWa).not.toHaveBeenCalled();
  });

  it("a WA ingest failure is acknowledged 200, same as IG/FB", async () => {
    ingestWa.mockRejectedValue(new Error("db down"));
    const res = await POST(signedRequest(WA_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(false);
  });
});
