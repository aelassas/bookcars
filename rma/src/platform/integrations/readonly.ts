// Source systems (Bitrix24, Kaiten, telephony, GPS) are STRICTLY READ-ONLY
// during data consolidation. This is the single global switch every outbound
// source call passes through. Default = ON (safe even if the env var is unset);
// set SOURCE_READ_ONLY=false to allow writes (never during consolidation).

export const SOURCE_READ_ONLY =
  (process.env.SOURCE_READ_ONLY ?? "true").toLowerCase() !== "false";

// Bitrix/Kaiten write verbs. Reads (.list/.get/.fields/...) are allowed.
const WRITE_METHOD = /(^|\.)(add|update|delete|del|set|import|bind|unbind|register|move|execute)(\.|$)/i;

/** Block any write call to a source system while read-only is on. */
export function assertReadOnlyMethod(method: string): void {
  if (SOURCE_READ_ONLY && WRITE_METHOD.test(method)) {
    throw new Error(`SOURCE_READ_ONLY: refused write call to source system: '${method}'`);
  }
}

/** Block any outbound message/call to a customer while read-only is on. */
export function assertOutboundDisabled(channel: string): void {
  if (SOURCE_READ_ONLY) {
    throw new Error(`SOURCE_READ_ONLY: outbound '${channel}' is disabled during read-only consolidation`);
  }
}
