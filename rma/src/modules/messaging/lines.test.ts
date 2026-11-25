import { describe, it, expect } from "vitest";
import { LINE_TENANT, tenantSlugForLine, DEFAULT_LINE_TENANT } from "./lines";

/**
 * These cases are not opinions — each one was read off the paired device on
 * 2026-08-05: the phone number and the WhatsApp profile name in
 * `wa-observer/session-<line>/creds.json`, cross-checked against how the line
 * signs itself in its own chats. The pm2 slug lies (three lines named
 * "babek-rent*" are EasyRent phones, and the line named "easyrent" is Ali's
 * Cardiwan phone), so the slug can never be the source of truth — this map is.
 */
describe("LINE_TENANT — the paired device decides the brand, not the slug", () => {
  it("files Babek's three phones under EasyRent, whatever the slug says", () => {
    // 971529965085 "EasyRent Luxury Car Rental"
    expect(tenantSlugForLine("babek-rent")).toBe("easyrent");
    // 971564048816 "Easy Rent car rental" (names ETM, the legal entity, in-chat)
    expect(tenantSlugForLine("babek-rent-2")).toBe("easyrent");
    // 971585809747 "EasyRent Car Rental"
    expect(tenantSlugForLine("babek-rent-3")).toBe("easyrent");
    // 971564048816 — ETM website's wa.me line, paired 2026-09-07 (was
    // babek-rent-2's number until that session died; now its own slug)
    expect(tenantSlugForLine("etm-website")).toBe("easyrent");
  });

  it("files the live Cardiwan lines under Cardiwan", () => {
    expect(tenantSlugForLine("babek-rent-4")).toBe("cardiwan"); // 971542445835 Ali
    expect(tenantSlugForLine("cardiwan")).toBe("cardiwan");     // 971569808087 Abdullah
  });

  it("keeps the retired duplicate slugs OUT of the map", () => {
    // "abdullah-takeauto" (971569808087) and "easyrent" (971542445835) were
    // stale SECOND pairings of phones already covered above; retired by the
    // owner 2026-08-05 together with their observed-*.jsonl and session dirs.
    expect(LINE_TENANT["abdullah-takeauto"]).toBeUndefined();
    expect(LINE_TENANT["easyrent"]).toBeUndefined();
  });

  it("keeps the sales line on take-auto", () => {
    expect(tenantSlugForLine("azat-takeauto")).toBe("take-auto");
    expect(tenantSlugForLine("firuz-takeauto")).toBe("take-auto");
    expect(tenantSlugForLine("mohammed-takeauto")).toBe("take-auto");
    expect(tenantSlugForLine("takeauto-leasing-dept")).toBe("take-auto");
  });

  it("files the RMA business line under rma", () => {
    // The dedicated 971581965238 line keeps the original rma-main slug so
    // existing message history and routing stay attached to it.
    expect(tenantSlugForLine("rma-main")).toBe("rma");
  });

  it("the Meta webhook accounts are mapped BEFORE pairing, and to the sales desk only", () => {
    // ig-takeauto / fb-takeauto are not WhatsApp lines — they are the account
    // slugs the Meta webhook receiver (`/api/webhooks/meta`) files Instagram
    // DM and Messenger rows under. They were mapped on 2026-09-15 before the
    // webhook subscription was verified, per the standing rule (an unmapped
    // slug falls through to the default tenant and re-files history onto the
    // wrong desk). They must NEVER resolve to a rental tenant — a rental
    // mapping would file sales DMs onto the rental board.
    for (const slug of ["ig-takeauto", "fb-takeauto"]) {
      expect(LINE_TENANT[slug], `meta account ${slug} missing from LINE_TENANT`).toBeDefined();
      expect(tenantSlugForLine(slug)).toBe("take-auto");
      expect(["cardiwan", "easyrent"]).not.toContain(tenantSlugForLine(slug));
    }
  });

  it("never files a LIVE rent line under take-auto by accident", () => {
    // The default is take-auto, so a rent line that falls out of the map goes
    // silently to the sales desk — and because the importer keys its dedupe on
    // (tenant_id, external_message_id), it would re-file that line's entire
    // archive into the sales desk as brand-new rows. Retiring a line therefore
    // means retiring its observed-*.jsonl FIRST; dropping it from this map
    // alone is the dangerous half of the operation.
    for (const line of ["babek-rent", "babek-rent-2", "babek-rent-3", "babek-rent-4", "cardiwan", "etm-website"]) {
      expect(LINE_TENANT[line], `live rent line ${line} missing from LINE_TENANT`).toBeDefined();
      expect(tenantSlugForLine(line)).not.toBe("take-auto");
    }
  });

  it("sends unknown and empty lines to the documented default", () => {
    expect(tenantSlugForLine("not-a-line")).toBe(DEFAULT_LINE_TENANT);
    expect(tenantSlugForLine(null)).toBe(DEFAULT_LINE_TENANT);
    expect(tenantSlugForLine("")).toBe(DEFAULT_LINE_TENANT);
  });

  it("uses only real tenant slugs — etm is EasyRent's legal name, not a tenant of its own", () => {
    const valid = new Set(["take-auto", "cardiwan", "easyrent", "rma"]);
    for (const [line, slug] of Object.entries(LINE_TENANT)) {
      expect(valid, `line ${line} maps to unexpected tenant ${slug}`).toContain(slug);
    }
  });
});
