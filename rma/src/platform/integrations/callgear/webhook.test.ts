import { createHmac } from "node:crypto";
import { describe, expect, it, afterEach, vi } from "vitest";
import {
  extractVirtualPhoneNumber,
  normalizeToCallFinished,
  verifyCallGearSignature,
} from "./webhook";

const BODY = '{"jsonrpc":"2.0","method":"call.finished","params":{}}';
const SECRET = "test-secret";

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verifyCallGearSignature", () => {
  afterEach(() => {
    delete process.env.CALLGEAR_WEBHOOK_SECRET;
    vi.unstubAllEnvs();
  });

  it("accepts a correctly signed body", () => {
    process.env.CALLGEAR_WEBHOOK_SECRET = SECRET;
    expect(verifyCallGearSignature(BODY, sign(BODY, SECRET))).toEqual({ ok: true, valid: true });
  });

  it("rejects a wrong signature — a present header must verify (no downgrade)", () => {
    process.env.CALLGEAR_WEBHOOK_SECRET = SECRET;
    const res = verifyCallGearSignature(BODY, sign(BODY, "other-secret"));
    expect(res.ok).toBe(false);
    expect(res).toHaveProperty("reason", "signature_mismatch");
  });

  it("accepts an UNSIGNED body when a secret is set (UIS panel cannot sign; path token is the credential)", () => {
    process.env.CALLGEAR_WEBHOOK_SECRET = SECRET;
    expect(verifyCallGearSignature(BODY, null)).toEqual({ ok: true, valid: false });
  });

  it("fails closed in production when no secret is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = verifyCallGearSignature(BODY, null);
    expect(res.ok).toBe(false);
    expect(res).toHaveProperty("reason", "signature_required");
  });
});

describe("normalizeToCallFinished", () => {
  it("passes JSON-RPC payloads through untouched", () => {
    const rpc = { jsonrpc: "2.0", method: "call.finished", id: "x", params: { callId: "c1", from: "+1" } };
    expect(normalizeToCallFinished(rpc)).toBe(rpc);
  });

  it("maps a UIS/CoMagic notification body into call.finished params", () => {
    const uis = {
      call_info: { call_session_id: 777001, direction: "in", talk_time_duration: 187, scenario_name: "Отдел продаж" },
      notification_time: "2026-08-08 09:38:19",
      virtual_phone_number: "97148236250",
      contact_info: { contact_phone_number: "971503111222", communication_number: "97148236250" },
      employee_info: { employee_name: "Babek Sadygov", employee_extension: "102" },
      site_domain_name: "go.callgear.ae",
      advertising_campaign: "Посты Ани",
      tag_names: ["Нецелевой контакт"],
    };
    const out = normalizeToCallFinished(uis);
    expect(out.method).toBe("call.finished");
    // numeric call_session_id under call_info, coerced to string
    expect(out.params.callId).toBe("777001");
    expect(out.params.from).toBe("971503111222");
    expect(out.params.to).toBe("97148236250");
    expect(out.params.duration).toBe(187);
    expect(out.params.direction).toBe("inbound");
    expect(out.params.startTime).toBe("2026-08-08T06:38:19.000Z"); // MSK wall clock → UTC
    expect(out.params.metadata).toMatchObject({ scenario: "Отдел продаж", campaign: "Посты Ани", site: "go.callgear.ae", tags: ["Нецелевой контакт"] });
    expect(out.params.agent?.name).toBe("Babek Sadygov");
    expect(out.params.agent?.extension).toBe("102");
    expect((out as unknown as Record<string, unknown>).uis_raw).toBe(uis);
  });

  // Verbatim from integration_event on 2026-08-10: ONE call from Babek's line
  // arrives as TWO notifications — "call ended" (has talk time, no recording)
  // and "recording ready" (has the file, no call_info). Both carry
  // call_session_id 207557522, but as a NUMBER and at different depths; the
  // old string-only reader missed both, so the pair split into two useless
  // half-cards. They MUST normalize to the same callId — that is what makes
  // the relay merge them into one complete card.
  it("pairs the call-ended and recording-ready notifications of one call", () => {
    const ended = {
      call_info: { direction: "in", call_source: "va", scenario_name: "Отдел продаж", call_session_id: 207557522, talk_time_duration: 17 },
      external_id: null,
      contact_info: { communication_number: 2, contact_phone_number: "971526747284" },
      employee_info: { employee_id: 740523, employee_full_name: "(bitrix24) Садыгов Бабек" },
      notification_time: "2026-08-10 10:47:55.568",
      virtual_phone_number: "97148236203",
    };
    const recorded = {
      tag_ids: [88],
      tag_names: ["Нецелевой контакт"],
      contact_info: { visitor_is_new: false, communication_number: 2, contact_phone_number: "971526747284" },
      employee_info: { employee_id: 740523, employee_full_name: "(bitrix24) Садыгов Бабек" },
      call_session_id: 207557522,
      site_domain_name: "easy-rent.ae",
      notification_time: "2026-08-10 10:47:38.835",
      advertising_campaign: "Посты Ани",
      virtual_phone_number: "97148236203",
      call_record_file_info: { file_link: "https://app.callgear.ae/system/media/talk/207557522/4a1f/", call_record_duration: 16 },
    };
    const a = normalizeToCallFinished(ended).params;
    const b = normalizeToCallFinished(recorded).params;

    expect(a.callId).toBe("207557522");
    expect(b.callId).toBe(a.callId);
    // Each half carries what the other lacks — the relay merges them.
    expect(a.duration).toBe(17);
    expect(a.recordingUrl).toBeUndefined();
    expect(b.recordingUrl).toBe("https://app.callgear.ae/system/media/talk/207557522/4a1f/");
    expect(b.duration).toBe(16); // call_record_duration when talk time is absent
    expect(a.agent?.name).toBe("(bitrix24) Садыгов Бабек");
    expect(b.metadata).toMatchObject({ site: "easy-rent.ae", campaign: "Посты Ани", tags: ["Нецелевой контакт"] });
  });

  it("extracts the virtual number from both dialects", () => {
    expect(extractVirtualPhoneNumber({ virtual_phone_number: "97148236250" })).toBe("97148236250");
    expect(extractVirtualPhoneNumber({ params: { to: "+97148236250" } })).toBe("+97148236250");
    expect(extractVirtualPhoneNumber({ params: {} })).toBeNull();
  });
});
