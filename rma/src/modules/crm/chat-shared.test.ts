import { describe, expect, it } from "vitest";
import { resolveReplyToJid } from "./chat-shared";

// The iron rule: a reply goes 1-to-1 to the PERSON, never to a group. The
// full resolver needs a live tx (exercised in the app); here we lock the pure
// decision core — especially that a group jid is REFUSED, not replied to.
describe("resolveReplyToJid", () => {
  it("targets the real person via from_pn when we resolved the number", () => {
    // Group inbound: `from` is the group jid, but from_pn is the participant.
    // We must reply 1:1 to the person, not the whole group.
    expect(resolveReplyToJid("120363000000000000@g.us", "971501234567")).toBe(
      "971501234567@s.whatsapp.net"
    );
  });

  it("prefers from_pn even when `from` is a 1:1 jid (privacy @lid case)", () => {
    expect(resolveReplyToJid("11223344@lid", "971509998877")).toBe(
      "971509998877@s.whatsapp.net"
    );
  });

  it("falls back to `from` when it is already a 1:1 jid and no from_pn", () => {
    expect(resolveReplyToJid("971501112233@s.whatsapp.net", null)).toBe(
      "971501112233@s.whatsapp.net"
    );
  });

  it("REJECTS a group jid when there is no from_pn — never blast the group", () => {
    expect(resolveReplyToJid("120363000000000000@g.us", null)).toBeNull();
  });

  it("returns null when there is no signal at all", () => {
    expect(resolveReplyToJid(null, null)).toBeNull();
  });
});
