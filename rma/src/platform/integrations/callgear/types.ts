// CallGear webhook payload types.
//
// CallGear emits "Call finished" events as JSON-RPC 2.0 over HTTP.
// Reference shape:
//   { "jsonrpc": "2.0", "method": "call.finished", "params": {...}, "id": "..." }
//
// `params` contents are documented per-installation; we capture the union of
// fields TAKE Auto needs. Anything we don't know yet stays in rawPayload on
// integration_event for the worker to read later.

export interface CallGearCallFinishedParams {
  callId: string;
  startTime: string; // ISO 8601
  endTime: string;
  duration: number; // seconds
  direction: "inbound" | "outbound" | string;
  from: string; // E.164 or local
  to: string;
  recordingUrl?: string | null;
  agent?: {
    id?: string;
    name?: string;
    extension?: string;
  } | null;
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface CallGearJsonRpcRequest<P = unknown> {
  jsonrpc: "2.0";
  method: string;
  params: P;
  id?: string | number | null;
}

export type CallGearCallFinishedRequest =
  CallGearJsonRpcRequest<CallGearCallFinishedParams>;

export interface NormalizedCallEvent {
  provider: "callgear";
  providerEventId: string;
  normalizedType: "call.finished";
  signatureValid: boolean;
  payload: CallGearCallFinishedParams;
}
