/**
 * canonicalName — collapse the many Bitrix/import account variants of ONE
 * person to a single display name (owner 2026-07-27: "Babek and Бабек Садыгов
 * is the same person, the others slightly differ but obviously the same"). The
 * sync keeps recreating variant accounts, so we normalise at read/display time
 * rather than merging rows — the badge and the per-person filter both use this.
 *
 * Junk/system assignees (the CallGear "Test Test" catch-all) collapse to null =
 * "не назначен", since they are not a real owner. Genuinely different people
 * (e.g. Alikhan Bursagov ≠ Ali) are left untouched.
 */
export function canonicalName(raw: string | null | undefined): string | null {
  const n = (raw ?? "").toLowerCase().trim();
  if (!n) return null;
  if (/test test|callgear/.test(n)) return null; // system catch-all → unassigned
  if (/бабек|\bbabek\b|sadygov/.test(n)) return "Babek";
  if (/abdulla/.test(n)) return "Abdullah";
  if (/firuz|khusainov/.test(n)) return "Firuz";
  if (/azat|yagdyyev/.test(n)) return "Azat";
  if (/alikhan/.test(n)) return raw!.trim(); // a different person, keep as-is
  if (/ali sohiel|\bali\b|alisohiel/.test(n)) return "Ali";
  if (/ammar|abouzaid|abuzid/.test(n)) return "Ammar";
  if (/\bmoe\b|mohmdinvest|mohammad imad|mohammed imad|mohmdimad/.test(n)) return "Moe";
  return raw!.trim();
}
