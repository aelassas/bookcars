/** "AA-22695" → { plateCode: "AA", plateNo: "22695" }; "DXB L 11911" → { L, 11911 }. */
export function parsePlate(raw: string | null | undefined): { plateCode: string; plateNo: string } | null {
  if (!raw) return null;
  const m = raw.trim().toUpperCase().match(/^(?:DXB[\s-]*)?([A-Z]{1,2})[\s-]?(\d{2,6})\b/);
  if (!m) return null;
  return { plateCode: m[1], plateNo: m[2] };
}
