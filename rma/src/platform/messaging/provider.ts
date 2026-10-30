export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface MessagingProvider {
  readonly channel: string;
  readonly mode: "live" | "mock";
  send(args: { to: string; body: string; tenantId: string; phoneNumberId?: string | null }): Promise<SendResult>;
}
