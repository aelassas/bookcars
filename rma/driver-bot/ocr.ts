// ============================================================================
// ocr.ts — document OCR via the local vision model (qwen3-vl on Ollama).
//
// Given a Telegram photo file_id, downloads the image and asks qwen3-vl to read
// a UAE document (driving licence / Emirates ID / passport / international
// licence) and return structured fields. 100% local — no cloud, no data leaves
// the box.
// ============================================================================

const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const VISION_MODEL = process.env.DRIVER_BOT_VISION_MODEL ?? "qwen3-vl:8b";

export interface DocFields {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dob?: string;
  nationality?: string;
  number?: string; // the document's own number (licence/EID/passport no.)
  issueDate?: string;
  expiryDate?: string;
  raw?: string; // raw model text, for audit
}

/** Download a Telegram file (by file_id) to a Buffer via the Bot API. */
export async function downloadTelegramPhoto(fileId: string, botToken: string): Promise<Buffer> {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const info = (await infoRes.json()) as { ok: boolean; result?: { file_path?: string }; description?: string };
  if (!info.ok || !info.result?.file_path) throw new Error(`getFile failed: ${info.description ?? "unknown"}`);
  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${info.result.file_path}`);
  if (!fileRes.ok) throw new Error(`file download failed: ${fileRes.status}`);
  return Buffer.from(await fileRes.arrayBuffer());
}

const PROMPTS: Record<string, string> = {
  driver_license:
    "This is a UAE driving licence. Read it and return ONLY JSON: {\"firstName\":\"\",\"lastName\":\"\",\"nationality\":\"\",\"dob\":\"DD/MM/YYYY\",\"number\":\"licence no\",\"issueDate\":\"DD/MM/YYYY\",\"expiryDate\":\"DD/MM/YYYY\"}. Use empty strings for anything unreadable.",
  intl_license:
    "This is an international driving permit. Return ONLY JSON: {\"firstName\":\"\",\"lastName\":\"\",\"nationality\":\"\",\"number\":\"\",\"issueDate\":\"DD/MM/YYYY\",\"expiryDate\":\"DD/MM/YYYY\"}.",
  passport:
    "This is a passport. Return ONLY JSON: {\"firstName\":\"given names\",\"lastName\":\"surname\",\"nationality\":\"\",\"dob\":\"DD/MM/YYYY\",\"number\":\"passport no\",\"expiryDate\":\"DD/MM/YYYY\"}.",
  emirates_id:
    "This is a UAE Emirates ID card. Return ONLY JSON: {\"fullName\":\"\",\"nationality\":\"\",\"dob\":\"DD/MM/YYYY\",\"number\":\"the 784-... ID number\",\"expiryDate\":\"DD/MM/YYYY\"}.",
};

function parseJson(s: string): Record<string, string> {
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < 0) return {};
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return {}; }
}

/** Read one document image with qwen3-vl and return structured fields. */
export async function readDocument(image: Buffer, ocrKind: string): Promise<DocFields> {
  const prompt = PROMPTS[ocrKind] ?? PROMPTS.driver_license;
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt,
      images: [image.toString("base64")],
      stream: false,
      options: { temperature: 0 },
      keep_alive: "30m",
    }),
  });
  if (!res.ok) throw new Error(`ollama vision ${res.status}`);
  const text = ((await res.json()) as { response?: string }).response ?? "";
  const j = parseJson(text);
  const out: DocFields = {
    firstName: j.firstName || undefined,
    lastName: j.lastName || undefined,
    fullName: j.fullName || undefined,
    dob: j.dob || undefined,
    nationality: j.nationality || undefined,
    number: j.number || undefined,
    issueDate: j.issueDate || undefined,
    expiryDate: j.expiryDate || undefined,
    raw: text.slice(0, 500),
  };
  // Derive first/last from fullName when the card only gave a combined name.
  if (!out.firstName && out.fullName) {
    const parts = out.fullName.split(/\s+/);
    out.firstName = parts.slice(0, -1).join(" ") || parts[0];
    out.lastName = parts.length > 1 ? parts[parts.length - 1] : undefined;
  }
  return out;
}
