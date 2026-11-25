"use server";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { IMAGE_TYPES, ALLOWED_FILE_TYPES } from "./constants";

// Private storage — NOT under public/, so files are never served statically.
// Documents are streamed only through the authenticated /api/files/[id] route.
const UPLOAD_ROOT = path.join(process.cwd(), ".private-uploads");
const PUBLIC_PREFIX = "/api/files";

export interface UploadedFile {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/__+/g, "_")
    .slice(0, 100);
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function writeLocalFile(buffer: Buffer, relativeDir: string, key: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, relativeDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path.join(dir, key), buffer);
  return `${PUBLIC_PREFIX}/${relativeDir}/${key}`;
}

async function uploadAny(options: {
  file: File;
  allowedTypes?: string[];
  maxBytes?: number;
  relativeDir: string;
}): Promise<UploadedFile> {
  const { file, allowedTypes = ALLOWED_FILE_TYPES, maxBytes = 10 * 1024 * 1024, relativeDir } = options;

  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed`);
  }

  if (file.size > maxBytes) {
    throw new Error(`File must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB`);
  }

  // R2 path: when R2_BUCKET_NAME is set, upload to R2 and return the public URL.
  // For now we store locally under public/uploads so onboarding works without credentials.
  // if (process.env.R2_BUCKET_NAME) { ... }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const key = `${cryptoRandomUUID()}-${sanitizeFilename(file.name)}`;
  const url = await writeLocalFile(buffer, relativeDir, key);

  return { url, key, size: file.size, mimeType: file.type };
}

export async function uploadDocument(file: File): Promise<UploadedFile> {
  return uploadAny({
    file,
    allowedTypes: ALLOWED_FILE_TYPES,
    maxBytes: 10 * 1024 * 1024,
    relativeDir: "documents",
  });
}

export async function uploadLogoFile(file: File): Promise<UploadedFile> {
  return uploadAny({
    file,
    allowedTypes: IMAGE_TYPES,
    maxBytes: 2 * 1024 * 1024,
    relativeDir: "logos",
  });
}
