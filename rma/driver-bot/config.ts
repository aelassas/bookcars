// ============================================================================
// config.ts — Driver-bot configuration: document checklist, legal defaults,
// and per-company contract templates (official branded PDF + stamp).
//
// Everything here is a DEFAULT with a clear override path. The document list is
// seeded with the 4 UAE docs; legal clauses are placeholders until the client
// finalises them. Per-company contract config maps a vehicle's company slug to
// its official PDF template + stamp image + field coordinates.
// ============================================================================

import path from "node:path";

// ─── Block 1: document checklist (ordered, mandatory, per-doc "no document") ──
export interface DocStep {
  key: string;
  label: string;
  /** Text on the "I don't have this" button. */
  skipLabel: string;
  /** If true, the doc is required to continue (no "no document" button). */
  required?: boolean;
  /** OCR hint — what document the vision model should read. */
  ocrKind: "driver_license" | "intl_license" | "passport" | "emirates_id";
}

export const DOCUMENT_STEPS: DocStep[] = [
  { key: "driver_license", label: "Driving Licence", skipLabel: "No licence", required: true, ocrKind: "driver_license" },
  { key: "intl_license", label: "International Licence", skipLabel: "No international", ocrKind: "intl_license" },
  { key: "passport", label: "Passport", skipLabel: "No passport", ocrKind: "passport" },
  { key: "emirates_id", label: "Emirates ID", skipLabel: "No Emirates ID", ocrKind: "emirates_id" },
];

// ─── Block 2: car photo steps (ordered, mandatory, one photo per step) ────────
// Full walk-around: front, both sides (2 photos each: front-half + rear-half),
// rear, then each of the 4 wheels. Every photo is embedded in the act.
export const CAR_PHOTO_STEPS: { key: string; label: string }[] = [
  { key: "front", label: "Front of the car" },
  { key: "left_front", label: "Left side — front half" },
  { key: "left_rear", label: "Left side — rear half" },
  { key: "rear", label: "Rear of the car" },
  { key: "right_rear", label: "Right side — rear half" },
  { key: "right_front", label: "Right side — front half" },
  { key: "wheel_fl", label: "Wheel — front left" },
  { key: "wheel_fr", label: "Wheel — front right" },
  { key: "wheel_rl", label: "Wheel — rear left" },
  { key: "wheel_rr", label: "Wheel — rear right" },
  { key: "interior", label: "Interior (cabin)" },
  { key: "trunk", label: "Inside the trunk" },
];

// ─── Legal defaults (placeholders until the client confirms) ──────────────────
export const LEGAL = {
  itemsLeftClause:
    process.env.DRIVER_BOT_ITEMS_CLAUSE ??
    "The company is NOT responsible for any personal items left inside the vehicle after handover/return.",
};

// ─── Per-company contract config (official branded PDF + stamp) ───────────────
export interface FieldPos { page: number; x: number; y: number; size?: number }
export interface CompanyContract {
  slug: string;
  name: string;
  templatePdf: string; // official branded PDF to overlay onto
  stampPng: string; // company stamp (auto-applied = "signed by company")
  stampAt: { page: number; x: number; y: number; width: number }; // stamp placement
  // Field coordinates on the template (PDF points, origin bottom-left).
  // These are BEST-ESTIMATE and meant to be tuned against a rendered proof.
  fields: Record<string, FieldPos>;
}

const CONTRACTS_DIR = process.env.DRIVER_BOT_CONTRACTS_DIR
  ?? path.resolve(__dirname, "company-contracts");
const stamp = (f: string) => path.join(CONTRACTS_DIR, "stamps", f);
const tmpl = (f: string) => path.join(CONTRACTS_DIR, "templates", f);

// Calibrated field map for the CARDIWAN template (612 x 792). Two value columns:
// left x≈120 (First/Last/DOB/Nationality/Mobile, Make/Model, Drop-off, Rate/Days),
// right x≈335 (EID/Passport/Licence/Issue/Expiry, Plate/Colour, Pickup, Total/Deposit).
// Y measured from the bottom. Tune with proofContract() if a field drifts.
// Calibrated from the template's own label bounding boxes (pdftotext -bbox).
// Value baselines = label baselines; left value column x≈115, right x≈298.
const CARDIWAN_FIELDS: Record<string, FieldPos> = {
  contractNo: { page: 0, x: 130, y: 632 },
  firstName: { page: 0, x: 115, y: 567 },
  lastName: { page: 0, x: 115, y: 553 },
  dob: { page: 0, x: 115, y: 538 },
  nationality: { page: 0, x: 115, y: 524 },
  mobile: { page: 0, x: 115, y: 510 },
  eid: { page: 0, x: 298, y: 567 },
  passport: { page: 0, x: 298, y: 553 },
  license: { page: 0, x: 298, y: 538 },
  issueDate: { page: 0, x: 298, y: 524 },
  expiryDate: { page: 0, x: 298, y: 510 },
  make: { page: 0, x: 115, y: 462 },
  model: { page: 0, x: 115, y: 448 },
  plate: { page: 0, x: 298, y: 462 },
  colour: { page: 0, x: 298, y: 448 },
  dropOffDate: { page: 0, x: 120, y: 400 },
  dropOffTime: { page: 0, x: 120, y: 386 },
  pickupDate: { page: 0, x: 298, y: 400 },
  pickupTime: { page: 0, x: 298, y: 386 },
  ratePerDay: { page: 0, x: 120, y: 357 },
  totalDays: { page: 0, x: 120, y: 343 },
  totalPrice: { page: 0, x: 298, y: 357 },
  deposit: { page: 0, x: 298, y: 343 },
  odometer: { page: 0, x: 500, y: 560 },
  fuel: { page: 0, x: 500, y: 470 },
};

// ETM template (596 x 843) — calibrated from its own label bboxes.
const ETM_FIELDS: Record<string, FieldPos> = {
  contractNo: { page: 0, x: 290, y: 675 },
  firstName: { page: 0, x: 100, y: 637 },
  lastName: { page: 0, x: 100, y: 625 },
  dob: { page: 0, x: 100, y: 613 },
  nationality: { page: 0, x: 100, y: 602 },
  mobile: { page: 0, x: 100, y: 590 },
  eid: { page: 0, x: 250, y: 637 },
  passport: { page: 0, x: 250, y: 625 },
  license: { page: 0, x: 250, y: 613 },
  issueDate: { page: 0, x: 250, y: 602 },
  expiryDate: { page: 0, x: 250, y: 590 },
  make: { page: 0, x: 100, y: 543 },
  model: { page: 0, x: 100, y: 533 },
  plate: { page: 0, x: 250, y: 543 },
  colour: { page: 0, x: 250, y: 533 },
  dropOffDate: { page: 0, x: 105, y: 501 },
  dropOffTime: { page: 0, x: 105, y: 489 },
  pickupDate: { page: 0, x: 250, y: 501 },
  pickupTime: { page: 0, x: 250, y: 489 },
  ratePerDay: { page: 0, x: 105, y: 435 },
  totalDays: { page: 0, x: 105, y: 425 },
  totalPrice: { page: 0, x: 250, y: 436 },
  deposit: { page: 0, x: 250, y: 425 },
  odometer: { page: 0, x: 480, y: 545 },
  fuel: { page: 0, x: 480, y: 505 },
};

export const COMPANY_CONTRACTS: Record<string, CompanyContract> = {
  cardiwan: {
    slug: "cardiwan",
    name: "CARDIWAN FOR CAR RENTAL CO. L.L.C",
    templatePdf: tmpl("cardiwan.pdf"),
    stampPng: stamp("cardiwan.png"),
    stampAt: { page: 0, x: 55, y: 70, width: 130 },
    fields: CARDIWAN_FIELDS,
  },
  etm: {
    slug: "etm",
    name: "E.T.M CAR RENTAL CO.",
    templatePdf: tmpl("etm.pdf"),
    stampPng: stamp("etm.png"),
    stampAt: { page: 0, x: 360, y: 470, width: 120 },
    fields: ETM_FIELDS,
  },
};

/** Company config for a vehicle's company slug; falls back to cardiwan. */
export function contractForCompany(slug: string | null | undefined): CompanyContract {
  return COMPANY_CONTRACTS[(slug ?? "").toLowerCase()] ?? COMPANY_CONTRACTS.cardiwan;
}
