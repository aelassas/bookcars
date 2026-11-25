// SPEC §4.3 / §4.5 — AutoFailoverProvider: local-first with Claude fallback.
//
// Races the local (on-prem) provider with a short timeout. If the local
// model errors or is slower than `timeoutMs`, falls back to Claude so the
// inbox never stalls when the Mac Studio is asleep/offline/over Tailscale
// hiccups. Customer data still prefers the local path whenever it's up.

import type {
  AIProvider,
  ClassifyResult,
  DraftReplyResult,
  ThreadMessage,
  VehicleSuggestion,
} from "../types";

export interface AutoFailoverOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;

export class AutoFailoverProvider implements AIProvider {
  name = "auto" as const;
  private readonly timeoutMs: number;

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
    opts: AutoFailoverOptions = {}
  ) {
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async classifyMessage(text: string): Promise<ClassifyResult> {
    try {
      return await this.race(() => this.primary.classifyMessage(text));
    } catch {
      return this.fallback.classifyMessage(text);
    }
  }

  async draftReply(
    thread: ThreadMessage[],
    availableVehicles: VehicleSuggestion[]
  ): Promise<DraftReplyResult> {
    try {
      return await this.race(() => this.primary.draftReply(thread, availableVehicles));
    } catch {
      return this.fallback.draftReply(thread, availableVehicles);
    }
  }

  /** Reject if the primary call doesn't settle within timeoutMs. */
  private race<T>(call: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`AutoFailoverProvider: primary timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs
      );
      call().then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        }
      );
    });
  }
}
