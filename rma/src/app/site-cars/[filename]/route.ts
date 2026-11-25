import { readFile } from "node:fs/promises";
import path from "node:path";

const FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.(jpg|png|webp)$/;
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!FILENAME.test(filename) || filename.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), "public", "site-cars", filename));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": CONTENT_TYPES[path.extname(filename)] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
