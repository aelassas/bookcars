import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { claude } from "@/platform/ai/providers/claude";
import { document } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { parseRecognizedCustomerData } from "./recognition";

const PROMPT = `Extract the renter's details from this Emirates ID, passport, UAE driving licence, or international driving permit. Return only fields clearly printed on the document. Use ISO YYYY-MM-DD dates. Never guess. Fields: name, phone, email, dateOfBirth, nationality, emiratesId, emiratesIdExpiry, passportNumber, driverLicenseNumber, driverLicenseExpiry.`;

const tool = {
  name: "record_customer_document",
  description: "Record only customer fields clearly visible on the document",
  input_schema: {
    type: "object" as const,
    properties: Object.fromEntries([
      "name", "phone", "email", "dateOfBirth", "nationality", "emiratesId",
      "emiratesIdExpiry", "passportNumber", "driverLicenseNumber", "driverLicenseExpiry",
    ].map((field) => [field, { type: "string" }])),
  },
};

async function updateRecognition(tenantId: string, id: string, patch: {
  recognitionStatus: string;
  recognizedData?: ReturnType<typeof parseRecognizedCustomerData> | null;
  recognitionError?: string | null;
  recognizedAt?: Date | null;
}) {
  await withDrizzleTenant(tenantId, (tx) => tx.update(document).set({ ...patch, updatedAt: new Date() }).where(eq(document.id, id)));
}

export async function runDocumentRecognition(tenantId: string, documentId: string): Promise<void> {
  const doc = await withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx.select().from(document).where(eq(document.id, documentId)).limit(1);
    return row ?? null;
  });
  if (!doc || doc.entityType !== "customer" || !["id", "license", "passport", "international_license"].includes(doc.category)) {
    throw new Error("Choose a customer ID, passport or licence document");
  }
  if (!claude) {
    await updateRecognition(tenantId, documentId, {
      recognitionStatus: "manual_required",
      recognitionError: "ANTHROPIC_API_KEY is not configured; enter the document details manually",
    });
    return;
  }

  await updateRecognition(tenantId, documentId, { recognitionStatus: "processing", recognitionError: null });
  try {
    const buffer = await readFile(path.join(process.cwd(), ".private-uploads", "documents", path.basename(doc.storageKey)));
    const data = buffer.toString("base64");
    const content = doc.mimeType === "application/pdf"
      ? [{ type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }]
      : ["image/jpeg", "image/png", "image/webp"].includes(doc.mimeType)
        ? [{ type: "image" as const, source: { type: "base64" as const, media_type: doc.mimeType as "image/jpeg" | "image/png" | "image/webp", data } }]
        : [];
    if (content.length === 0) throw new Error("Automatic recognition supports PDF, JPEG, PNG and WebP");

    const response = await claude.messages.create({
      model: process.env.DOCUMENT_OCR_MODEL ?? "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: [...content, { type: "text", text: PROMPT }] }],
    });
    const use = response.content.find((block) => block.type === "tool_use");
    if (!use || use.type !== "tool_use") throw new Error("The recognition service returned no structured data");
    const recognizedData = parseRecognizedCustomerData(use.input);
    await updateRecognition(tenantId, documentId, {
      recognitionStatus: "review_required",
      recognizedData,
      recognitionError: null,
      recognizedAt: new Date(),
    });
  } catch (error) {
    await updateRecognition(tenantId, documentId, {
      recognitionStatus: "failed",
      recognitionError: error instanceof Error ? error.message.slice(0, 500) : "Recognition failed",
    });
  }
}
