export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const ALLOWED_FILE_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];
