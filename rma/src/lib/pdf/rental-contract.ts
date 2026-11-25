// platform/src/lib/pdf/rental-contract.ts
// Node-only module: called from a Next.js API route (not a Server Action or
// Edge runtime). Do not import this from client components or Server Actions.
//
// Layout mirrors the company's real two-page rental agreement (see
// docs-ingest/contracts/Contract Edited-1.pdf — Cardiwan):
//   page 1 — fully dynamic bilingual-looking form (English text only)
//   page 2 — the static branded terms & conditions image
//
// HARD CONSTRAINT: pdfkit cannot shape Arabic. Every Arabic glyph on the
// output lives inside a PNG; nothing Arabic is ever drawn as text. The
// contract's own clause makes the English text prevail, so page 1 is English.
// Only the built-in AFM fonts (Helvetica family) are used — no font files.
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";

export interface RentalContractPdfData {
  reference: string;
  companyName: string;
  /** Tenant/company slug — selects the page-2 terms image. */
  companySlug?: string | null;

  // Driver (renter). Blank fields are rendered blank, exactly like a human
  // agent leaves them when the document wasn't collected/OCR'd yet.
  customerName: string;
  customerPhone?: string | null;
  customerDob?: Date | string | null;
  customerNationality?: string | null;
  customerEid?: string | null;
  customerPassport?: string | null;
  customerLicenseNumber?: string | null;
  customerLicenseIssue?: Date | string | null;
  customerLicenseExpiry?: Date | string | null;

  // Vehicle
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear?: number | null;
  vehicleColour?: string | null;
  /** Odometer at handover — drawn into the EXIT diagram's KM boxes. */
  exitOdometer?: number | null;
  /** 0-100 fuel at handover — drawn onto the EXIT diagram's gauge. */
  exitFuelPercent?: number | null;
  /** Odometer at return — drawn into the RETURN diagram's KM boxes. */
  returnOdometer?: number | null;
  /** 0-100 fuel at return — drawn onto the RETURN diagram's gauge. */
  returnFuelPercent?: number | null;

  // Period & money
  startDate: Date | null;
  returnDate: Date | null;
  totalDays: number | null;
  dailyRate: number | null;
  deposit: number | null;
  rentalSubtotal: number | null;
  /** Handover address, free text. */
  address?: string | null;

  // Additional remarks — omitted values fall back to REMARK_DEFAULTS.
  dailyKmLimit?: string | null;
  extraKmFee?: string | null;
  tollGate?: string | null;
  additionalGps?: string | null;
  childSeat?: string | null;
  recoveryFee?: string | null;

  exitRemarks?: string | null;
  returnRemarks?: string | null;
}

// ─── Per-company constants ─────────────────────────────────────────────────

/** Defaults for the ADDITIONAL REMARKS block — house policy, not per rental. */
const REMARK_DEFAULTS = {
  dailyKmLimit: "250 KM / Day",
  extraKmFee: "AED 0.50 / KM",
  tollGate: "Salik at cost",
  additionalGps: "Included",
  childSeat: "On request",
  recoveryFee: "AED 500",
} as const;

/** Rules printed above the signature row — copied from the real contract. */
const RULE_BULLETS: Array<[string, string]> = [
  [
    "Desert / Restricted areas driving is NOT ALLOWED\nAED 5,000 fine & all damage cost.",
    "Security deposit will be released 28 days after\nthe rental ends.",
  ],
  [
    "Race tracking is NOT ALLOWED\nAED 5,000 fine & all damage cost.",
    "Cars returned 2 hrs later than the time due are\ncharged an additional day.",
  ],
  [
    "Smoking is NOT ALLOWED\nAED 500 fine plus all damage cost.",
    "We are not responsible for any items left inside\nthe vehicle after pickup.",
  ],
];

/**
 * Page-2 terms image per company. Swapping in a new company's branded terms
 * page is one entry here — no layout code changes.
 */
const TERMS_PAGE_BY_COMPANY: Record<string, string> = {
  cardiwan: "cardiwan-terms-page2.png",
};
const DEFAULT_TERMS_PAGE = "cardiwan-terms-page2.png";

// ─── Geometry ──────────────────────────────────────────────────────────────

const PAGE_MARGIN = 24;
const COLOR_BAND = "#111111";
const COLOR_TEXT = "#111111";
const COLOR_MUTED = "#555555";
const COLOR_LINE = "#9a9a9a";
const COLOR_SECTION_BG = "#e6e6e6";

const ROW_H = 15.5;
const SECTION_H = 16;

/**
 * Overlay calibration per diagram, as fractions of the image box. Each PNG
 * has its own numbers because the return diagram carries an Arabic band on
 * top that pushes its gauge and KM boxes down.
 */
interface DiagramCalibration {
  file: string;
  /** width / height of the source PNG — keeps the aspect ratio honest. */
  aspect: number;
  /** Vertical fuel gauge: x centre, "F" tick y, "E" tick y (all fractional). */
  fuelX: number;
  fuelTopY: number;
  fuelBottomY: number;
  /** KM digit boxes: left/right x, top/bottom y (fractional), and cell count. */
  kmLeftX: number;
  kmRightX: number;
  kmTopY: number;
  kmBottomY: number;
  kmCells: number;
}

const EXIT_DIAGRAM: DiagramCalibration = {
  file: "vehicle-exit-diagram.png",
  aspect: 383 / 470,
  fuelX: 0.76,
  fuelTopY: 0.483,
  fuelBottomY: 0.748,
  kmLeftX: 0.308,
  kmRightX: 0.705,
  kmTopY: 0.905,
  kmBottomY: 0.958,
  kmCells: 6,
};

const RETURN_DIAGRAM: DiagramCalibration = {
  file: "vehicle-return-diagram.png",
  aspect: 383 / 475,
  fuelX: 0.76,
  fuelTopY: 0.541,
  fuelBottomY: 0.816,
  kmLeftX: 0.308,
  kmRightX: 0.705,
  kmTopY: 0.968,
  kmBottomY: 1.0,
  kmCells: 6,
};

// ─── Asset resolution ──────────────────────────────────────────────────────

/**
 * Assets live next to this module in source. Next bundles the route but
 * pdfkit is externalized and the server runs from the project root, so both
 * the cwd-relative path and the module-relative path are tried. A missing
 * asset degrades to "no image" rather than failing contract generation.
 */
function assetPath(file: string): string | null {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "pdf", "assets", file),
    path.join(process.cwd(), "platform", "src", "lib", "pdf", "assets", file),
  ];
  // Module-relative first when available (ESM at runtime); the tsx/CJS
  // transform used by scripts/ has no import.meta, hence the guard.
  try {
    const here = import.meta.dirname;
    if (here) candidates.unshift(path.join(here, "assets", file));
  } catch {
    /* not ESM — cwd candidates below cover it */
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ─── Formatting ────────────────────────────────────────────────────────────

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Blank, not an em-dash: an unknown field looks like a blank on paper. */
function fmtDate(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "";
  return `AED ${v.toLocaleString("en-US")}`;
}

function txt(v: string | number | null | undefined): string {
  return v != null && v !== "" ? String(v) : "";
}

function splitName(full: string): { first: string; last: string } {
  const parts = txt(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// ─── Primitives ────────────────────────────────────────────────────────────

/** Full-width grey section header bar. Returns the y below it. */
function sectionBar(
  doc: PDFKit.PDFDocument,
  label: string,
  x: number,
  y: number,
  w: number
): number {
  doc.rect(x, y, w, SECTION_H).fill(COLOR_SECTION_BG);
  doc
    .fillColor(COLOR_TEXT)
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(label, x, y + 4, { width: w, align: "center" });
  return y + SECTION_H;
}

/**
 * One boxed form row: up to two label/value pairs side by side. Passing a
 * single pair with `span` makes it run the full width (used for Address).
 */
function fieldRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  left: [string, string],
  right?: [string, string]
): number {
  const halfW = right ? w / 2 : w;
  const labelW = right ? halfW * 0.44 : w * 0.22;

  doc.strokeColor(COLOR_LINE).lineWidth(0.4).rect(x, y, w, ROW_H).stroke();
  if (right) {
    doc
      .moveTo(x + halfW, y)
      .lineTo(x + halfW, y + ROW_H)
      .stroke();
  }

  const cells: Array<[number, [string, string]]> = right
    ? [
        [x, left],
        [x + halfW, right],
      ]
    : [[x, left]];

  for (const [cx, [label, value]] of cells) {
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLOR_MUTED)
      .text(label, cx + 4, y + 4, { width: labelW - 6, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(COLOR_TEXT)
      .text(value, cx + labelW, y + 4, {
        width: halfW - labelW - 6,
        lineBreak: false,
        ellipsis: true,
      });
  }
  return y + ROW_H;
}

/** Renders a condition diagram plus the KM / fuel markers drawn over it. */
function conditionDiagram(
  doc: PDFKit.PDFDocument,
  cal: DiagramCalibration,
  x: number,
  y: number,
  w: number,
  odometer: number | null | undefined,
  fuelPercent: number | null | undefined
): number {
  const h = w / cal.aspect;
  const file = assetPath(cal.file);
  if (!file) {
    // Asset missing: leave an empty framed box so the page still prints.
    doc.strokeColor(COLOR_LINE).lineWidth(0.5).rect(x, y, w, h).stroke();
    return y + h;
  }
  doc.image(file, x, y, { width: w });

  // Fuel marker: a filled arrow on the gauge at the measured level.
  if (fuelPercent != null) {
    const pct = Math.max(0, Math.min(100, fuelPercent)) / 100;
    const top = y + cal.fuelTopY * h;
    const bottom = y + cal.fuelBottomY * h;
    const my = bottom - pct * (bottom - top);
    const mx = x + cal.fuelX * w;
    // Arrow sits to the RIGHT of the gauge — the F/E labels are on its left.
    doc
      .save()
      .fillColor(COLOR_TEXT)
      .moveTo(mx + 10, my)
      .lineTo(mx + 4, my - 3)
      .lineTo(mx + 4, my + 3)
      .closePath()
      .fill();
    doc
      .strokeColor(COLOR_TEXT)
      .lineWidth(1.2)
      .moveTo(mx - 1, my)
      .lineTo(mx + 5, my)
      .stroke()
      .restore();
  }

  // KM: one digit per box, right-aligned into the printed cells.
  if (odometer != null) {
    const left = x + cal.kmLeftX * w;
    const right = x + cal.kmRightX * w;
    const top = y + cal.kmTopY * h;
    const bottom = y + cal.kmBottomY * h;
    const cellW = (right - left) / cal.kmCells;
    const digits = String(Math.max(0, Math.round(odometer))).slice(-cal.kmCells).split("");
    const offset = cal.kmCells - digits.length;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLOR_TEXT);
    digits.forEach((d, i) => {
      doc.text(d, left + (offset + i) * cellW, top + (bottom - top - 8) / 2 + 1, {
        width: cellW,
        align: "center",
        lineBreak: false,
      });
    });
  }
  return y + h;
}

// ─── Page 1 ────────────────────────────────────────────────────────────────

function drawPage1(doc: PDFKit.PDFDocument, data: RentalContractPdfData): void {
  const pageW = doc.page.width;
  const contentX = PAGE_MARGIN;
  const contentW = pageW - PAGE_MARGIN * 2;

  // Header band — clean black bar, company name left, title right.
  const bandH = 46;
  doc.rect(contentX, PAGE_MARGIN, contentW, bandH).fill(COLOR_BAND);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(data.companyName.toUpperCase(), contentX + 12, PAGE_MARGIN + 10, {
      width: contentW * 0.5,
      lineBreak: false,
      ellipsis: true,
    });
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#cccccc")
    .text("Your Journey, Our Passion", contentX + 12, PAGE_MARGIN + 28, {
      width: contentW * 0.5,
      lineBreak: false,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#ffffff")
    .text("CAR RENTAL AGREEMENT", contentX + contentW * 0.5, PAGE_MARGIN + 17, {
      width: contentW * 0.5 - 12,
      align: "right",
      lineBreak: false,
    });

  let y = PAGE_MARGIN + bandH + 8;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLOR_TEXT)
    .text(`Contract Number:  ${txt(data.reference)}`, contentX, y, { lineBreak: false });
  y += 14;

  // Two columns: form on the left, condition diagrams on the right.
  const rightW = 198;
  const gap = 10;
  const leftW = contentW - rightW - gap;
  const leftX = contentX;
  const rightX = contentX + leftW + gap;
  const topY = y;

  const name = splitName(data.customerName);

  // DRIVER INFORMATION
  y = sectionBar(doc, "DRIVER INFORMATION", leftX, y, leftW);
  y = fieldRow(doc, leftX, y, leftW, ["First Name", name.first], ["EID Number", txt(data.customerEid)]);
  y = fieldRow(doc, leftX, y, leftW, ["Last Name", name.last], ["Passport Number", txt(data.customerPassport)]);
  y = fieldRow(doc, leftX, y, leftW, ["D.O.B", fmtDate(data.customerDob)], ["License Number", txt(data.customerLicenseNumber)]);
  y = fieldRow(doc, leftX, y, leftW, ["Nationality", txt(data.customerNationality)], ["Issue Date", fmtDate(data.customerLicenseIssue)]);
  y = fieldRow(doc, leftX, y, leftW, ["Mobile", txt(data.customerPhone)], ["Expiry Date", fmtDate(data.customerLicenseExpiry)]);

  // VEHICLE INFORMATION
  y += 4;
  const groupMake = [txt(data.vehicleMake), data.vehicleYear ? `(${data.vehicleYear})` : ""]
    .filter(Boolean)
    .join(" ");
  y = sectionBar(doc, "VEHICLE INFORMATION", leftX, y, leftW);
  y = fieldRow(doc, leftX, y, leftW, ["Group/Make", groupMake], ["Plate Number", txt(data.vehiclePlate)]);
  y = fieldRow(doc, leftX, y, leftW, ["Model", txt(data.vehicleModel)], ["Colour", txt(data.vehicleColour)]);

  // VEHICLE RENTAL PERIOD
  // "Drop Off" is the handover to the renter (rental start); "Pickup" is the
  // collection back by the agency (rental end) — same sense as the paper form.
  y += 4;
  y = sectionBar(doc, "VEHICLE RENTAL PERIOD", leftX, y, leftW);
  y = fieldRow(doc, leftX, y, leftW, ["Drop Off Date", fmtDate(data.startDate)], ["Pickup Date", fmtDate(data.returnDate)]);
  y = fieldRow(doc, leftX, y, leftW, ["Drop Off Time", fmtTime(data.startDate)], ["Pickup Time", fmtTime(data.returnDate)]);
  y = fieldRow(doc, leftX, y, leftW, ["Address", txt(data.address)]);
  y = fieldRow(doc, leftX, y, leftW, ["Rate per day", fmtMoney(data.dailyRate)], ["Total Rent price", fmtMoney(data.rentalSubtotal)]);
  y = fieldRow(doc, leftX, y, leftW, ["Total Rent Days", txt(data.totalDays)], ["Security Deposit", fmtMoney(data.deposit)]);

  // ADDITIONAL REMARKS
  y += 4;
  y = sectionBar(doc, "ADDITIONAL REMARKS", leftX, y, leftW);
  y = fieldRow(
    doc, leftX, y, leftW,
    ["Daily KM Limit", txt(data.dailyKmLimit) || REMARK_DEFAULTS.dailyKmLimit],
    ["Additional GPS", txt(data.additionalGps) || REMARK_DEFAULTS.additionalGps]
  );
  y = fieldRow(
    doc, leftX, y, leftW,
    ["Extra KM Fee", txt(data.extraKmFee) || REMARK_DEFAULTS.extraKmFee],
    ["Child Seat", txt(data.childSeat) || REMARK_DEFAULTS.childSeat]
  );
  y = fieldRow(
    doc, leftX, y, leftW,
    ["Toll Gate", txt(data.tollGate) || REMARK_DEFAULTS.tollGate],
    ["Recovery Fee", txt(data.recoveryFee) || REMARK_DEFAULTS.recoveryFee]
  );

  // SECOND DRIVER (GUARANTOR) — always blank; filled by hand at the desk.
  y += 4;
  y = sectionBar(doc, "SECOND DRIVER (GUARANTOR) INFORMATION", leftX, y, leftW);
  y = fieldRow(doc, leftX, y, leftW, ["First Name", ""], ["Passport Number", ""]);
  y = fieldRow(doc, leftX, y, leftW, ["Last Name", ""], ["License Number", ""]);
  y = fieldRow(doc, leftX, y, leftW, ["Nationality", ""], ["Issue Date", ""]);
  y = fieldRow(doc, leftX, y, leftW, ["D.O.B", ""], ["Expiry Date", ""]);

  // Rules
  y += 8;
  const bulletColW = leftW / 2 - 6;
  doc.fontSize(6.5).font("Helvetica").fillColor(COLOR_TEXT);
  const bulletIndent = 8;
  for (const [a, b] of RULE_BULLETS) {
    const rowY = y;
    let below = rowY;
    for (const [bx, text] of [
      [leftX, a],
      [leftX + leftW / 2, b],
    ] as Array<[number, string]>) {
      doc.text("•", bx, rowY, { lineBreak: false });
      doc.text(text, bx + bulletIndent, rowY, {
        width: bulletColW - bulletIndent,
        lineGap: 0.5,
      });
      below = Math.max(below, doc.y);
    }
    y = below + 3;
  }

  // Signature row
  y += 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLOR_TEXT)
    .text("I read both sides of this contract and sign on my agreement", leftX, y, {
      width: leftW,
      align: "center",
    });
  y += 34;
  const sigW = leftW / 2 - 20;
  doc
    .strokeColor(COLOR_TEXT)
    .lineWidth(0.6)
    .moveTo(leftX, y).lineTo(leftX + sigW, y).stroke()
    .moveTo(leftX + leftW / 2, y).lineTo(leftX + leftW / 2 + sigW, y).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(COLOR_MUTED);
  doc.text("Agency Signature", leftX, y + 4, { width: sigW });
  doc.text("Renter Signature", leftX + leftW / 2, y + 4, { width: sigW });

  // ── Right column: exit / return condition diagrams ──
  let ry = topY;
  ry = conditionDiagram(doc, EXIT_DIAGRAM, rightX, ry, rightW, data.exitOdometer, data.exitFuelPercent);
  ry = remarksBlock(doc, rightX, ry + 6, rightW, data.exitRemarks);
  ry += 10;
  ry = conditionDiagram(doc, RETURN_DIAGRAM, rightX, ry, rightW, data.returnOdometer, data.returnFuelPercent);
  remarksBlock(doc, rightX, ry + 10, rightW, data.returnRemarks);

  // Footer
  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(COLOR_MUTED)
    .text(
      "Generated electronically. The English text of this agreement prevails.",
      contentX,
      doc.page.height - PAGE_MARGIN - 8,
      { width: contentW, align: "center" }
    );
}

/** "Remarks" caption plus two ruled lines under a condition diagram. */
function remarksBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  value: string | null | undefined
): number {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_TEXT).text("Remarks", x, y, { width: w });
  let ly = y + 10;
  const text = txt(value);
  if (text) {
    doc.font("Helvetica").fontSize(7).fillColor(COLOR_TEXT).text(text, x, ly, { width: w, height: 20, ellipsis: true });
    ly = Math.max(ly + 10, doc.y);
  }
  doc.strokeColor(COLOR_LINE).lineWidth(0.4);
  for (let i = 0; i < 2; i++) {
    doc.moveTo(x, ly).lineTo(x + w, ly).stroke();
    ly += 10;
  }
  return ly;
}

// ─── Page 2 ────────────────────────────────────────────────────────────────

function drawPage2(doc: PDFKit.PDFDocument, companySlug: string | null | undefined): void {
  const file = TERMS_PAGE_BY_COMPANY[txt(companySlug).toLowerCase()] ?? DEFAULT_TERMS_PAGE;
  const resolved = assetPath(file);
  doc.addPage({ size: "A4", margin: 0 });
  if (!resolved) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .text("Standard Terms and Conditions of Rental — see the signed paper copy.", 40, 60, {
        width: doc.page.width - 80,
      });
    return;
  }
  const m = 12;
  doc.image(resolved, m, m, {
    fit: [doc.page.width - m * 2, doc.page.height - m * 2],
    align: "center",
    valign: "center",
  });
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function buildRentalContractPdf(data: RentalContractPdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawPage1(doc, data);
      drawPage2(doc, data.companySlug);

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
