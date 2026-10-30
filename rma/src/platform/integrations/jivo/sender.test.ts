// The JivoChat Bot API sender — env gates, the BOT_MESSAGE request shape, and
// typed failures (never a throw). The auto-ack is OFF unless JIVO_AUTOREPLY
// says otherwise.
import { describe, expect, it, vi } from "vitest";
import {
  JIVO_SEND_TIMEOUT_MS,
  jivoAutoReplyFromEnv,
  jivoBotConfigFromEnv,
  sendBotText,
  type JivoBotConfig,
} from "./sender";

const CFG: JivoBotConfig = {
  providerId: "Ee0CRkyDAp",
  token: "zhFZipzT:8560a55a",
  baseUrl: "https://bot.jivosite.com",
};

describe("jivoBotConfigFromEnv / jivoAutoReplyFromEnv — the gates", () => {
  it("config is null until BOTH provider id and token exist", () => {
    expect(jivoBotConfigFromEnv({})).toBeNull();
    expect(jivoBotConfigFromEnv({ JIVO_BOT_PROVIDER_ID: "p" })).toBeNull();
    expect(jivoBotConfigFromEnv({ JIVO_WEBHOOK_TOKEN: "t" })).toBeNull();
    expect(jivoBotConfigFromEnv({ JIVO_BOT_PROVIDER_ID: "p", JIVO_WEBHOOK_TOKEN: "t" })).toEqual({
      providerId: "p",
      token: "t",
      baseUrl: "https://bot.jivosite.com",
    });
  });

  it("the auto-reply is OFF by default — the owner killed the WA auto-greeting yesterday", () => {
    expect(jivoAutoReplyFromEnv({}).enabled).toBe(false);
    expect(jivoAutoReplyFromEnv({ JIVO_AUTOREPLY: "off" }).enabled).toBe(false);
    expect(jivoAutoReplyFromEnv({ JIVO_AUTOREPLY: "yes please" }).enabled).toBe(false);
    for (const on of ["on", "true", "1", "ON"]) {
      expect(jivoAutoReplyFromEnv({ JIVO_AUTOREPLY: on }).enabled).toBe(true);
    }
    expect(jivoAutoReplyFromEnv({ JIVO_AUTOREPLY: "on", JIVO_AUTOREPLY_TEXT: "  Hi there  " }).text).toBe("Hi there");
  });
});

describe("sendBotText — the BOT_MESSAGE request shape", () => {
  function fetchReturning(status: number, payload: unknown) {
    return vi.fn(async () => new Response(JSON.stringify(payload), { status }));
  }

  it("posts TEXT to bot.jivosite.com/webhooks/<provider>/<token>", async () => {
    const f = fetchReturning(200, {});
    const r = await sendBotText(CFG, { clientId: "47454", chatId: "2037" }, "Hello!", f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true });
    const [url, init] = (f as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://bot.jivosite.com/webhooks/Ee0CRkyDAp/zhFZipzT:8560a55a");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      event: "BOT_MESSAGE",
      client_id: "47454",
      chat_id: "2037",
      message: { type: "TEXT", text: "Hello!" },
    });
    expect(typeof body.id).toBe("string");
    expect(typeof body.message.timestamp).toBe("number");
  });

  it("a Jivo API error is {ok:false} with the message, never a throw", async () => {
    const f = fetchReturning(401, { error: { code: "invalid_client", message: "Token client authentication error" } });
    const r = await sendBotText(CFG, { clientId: "1", chatId: "2" }, "hi", f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.error).toContain("authentication");
    }
  });

  it("a network failure is {ok:false} too", async () => {
    const f = vi.fn(async () => {
      throw new Error("fetch failed");
    });
    const r = await sendBotText(CFG, { clientId: "1", chatId: "2" }, "hi", f as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, error: "fetch failed" });
  });

  it("junk input never reaches the API", async () => {
    const f = vi.fn();
    expect((await sendBotText(CFG, { clientId: "", chatId: "2" }, "hi", f as unknown as typeof fetch)).ok).toBe(false);
    expect((await sendBotText(CFG, { clientId: "1", chatId: "2" }, "  ", f as unknown as typeof fetch)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("the send is bounded by the house timeout", () => {
    expect(JIVO_SEND_TIMEOUT_MS).toBe(10_000);
  });
});
