// Twilio adapter for the platform's call contour (provider-agnostic core in
// modules/crm/call-actions.ts — this file is the ONLY Twilio-shaped piece).
//
// Live when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER are
// set; otherwise a Mock that "succeeds" without touching the network, so the
// platform always boots and the UI is testable end-to-end.
//
// Outbound model (v1): Twilio calls the MANAGER's phone first; on answer it
// dials the client with dual-channel recording. No browser audio yet (WebRTC
// is a later increment).

export type StartCallResult = { providerCallId: string };

export interface TelephonyClient {
  mode: "live" | "mock";
  startOutboundCall(args: {
    managerPhone: string;
    clientPhone: string;
    statusCallbackUrl: string;
    recordingCallbackUrl: string;
  }): Promise<StartCallResult>;
}

const TWILIO_API = "https://api.twilio.com/2010-04-01";

class LiveClient implements TelephonyClient {
  readonly mode = "live" as const;
  constructor(
    private readonly sid: string,
    private readonly token: string,
    private readonly fromNumber: string
  ) {}

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.sid}:${this.token}`).toString("base64");
  }

  async startOutboundCall(args: StartArgs): Promise<StartCallResult> {
    const twiml =
      `<Response><Dial record="record-from-answer-dual" ` +
      `recordingStatusCallback="${args.recordingCallbackUrl}" ` +
      `recordingStatusCallbackMethod="POST">${args.clientPhone}</Dial></Response>`;
    const body = new URLSearchParams({
      To: args.managerPhone,
      From: this.fromNumber,
      Twiml: twiml,
      StatusCallback: args.statusCallbackUrl,
      StatusCallbackMethod: "POST",
      StatusCallbackEvent: "initiated ringing answered completed",
    });
    const res = await fetch(`${TWILIO_API}/Accounts/${this.sid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: this.authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok || !data?.sid) {
      throw new Error(`Twilio call failed (${res.status}): ${data?.message ?? "unknown"}`);
    }
    return { providerCallId: data.sid };
  }
}

type StartArgs = Parameters<TelephonyClient["startOutboundCall"]>[0];

class MockClient implements TelephonyClient {
  readonly mode = "mock" as const;
  async startOutboundCall(): Promise<StartCallResult> {
    return { providerCallId: `MOCK-${crypto.randomUUID()}` };
  }
}

let cached: TelephonyClient | null = null;

export function getTwilioClient(): TelephonyClient {
  if (cached) return cached;
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  cached = sid && token && from ? new LiveClient(sid, token, from) : new MockClient();
  return cached;
}
