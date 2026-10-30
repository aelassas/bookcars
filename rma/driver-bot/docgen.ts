// ============================================================================
// docgen.ts — PDF generation for the Driver Bot (pure Node, pdfkit).
//
// Produces two A4 documents from plain field data:
//   1. Acceptance Act        (vehicle handover / return condition record)
//   2. Rental Contract       (rental agreement summary)
//
// Everything is returned as an in-memory Buffer so the bot can send it to
// Telegram and/or persist it. A save-to-disk helper is also provided.
// ============================================================================

import PDFDocument from "pdfkit";
import { promises as fs } from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** Kind of handover event driving which document header/wording is used. */
export type ActKind = "handover" | "return";

/** Company / letterhead details shown at the top of every document. */
export interface CompanyInfo {
  name: string;
  addressLines?: string[];
  phone?: string;
  email?: string;
  trn?: string; // UAE Tax Registration Number
}

/** Vehicle identity. */
export interface VehicleInfo {
  make: string;
  model: string;
  plate: string;
  year?: number | null;
}

/** Customer identity. */
export interface CustomerInfo {
  name: string;
  phone?: string | null;
}

/** Physical condition captured at handover / return. */
export interface ConditionInfo {
  odometer?: number | null; // km
  fuel?: string | null; // e.g. "Full", "3/4", "1/2"
  notes?: string | null;
}

/** Financial / period details for the rental contract. */
export interface ContractTerms {
  startDate?: Date | string | null;
  returnDate?: Date | string | null;
  dailyRate?: number | null; // minor units (fils) or whole AED — see currency
  totalDays?: number | null;
  deposit?: number | null;
  total?: number | null;
  currency?: string; // default "AED"
}

/** Full payload for the Acceptance Act. */
export interface AcceptanceActData {
  kind: ActKind;
  company: CompanyInfo;
  vehicle: VehicleInfo;
  customer: CustomerInfo;
  condition: ConditionInfo;
  date?: Date | string | null;
  reference?: string | null; // e.g. rental id / act number
  photos?: { label: string; image: Buffer }[]; // car photos to embed
  itemsClause?: string; // "not responsible for items left" legal text
}

/** Full payload for the Rental Contract. */
export interface RentalContractData {
  company: CompanyInfo;
  vehicle: VehicleInfo;
  customer: CustomerInfo;
  terms: ContractTerms;
  date?: Date | string | null;
  reference?: string | null;
}

// ----------------------------------------------------------------------------
// Layout constants (A4 @ 72dpi = 595.28 x 841.89 pt)
// ----------------------------------------------------------------------------

const PAGE_MARGIN = 50;
const COLOR_TEXT = "#1a1a1a";
const COLOR_MUTED = "#666666";
const COLOR_LINE = "#cccccc";
const COLOR_ACCENT = "#0b3d2e"; // TAKE Auto deep green

// ----------------------------------------------------------------------------
// Small formatting helpers
// ----------------------------------------------------------------------------

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(v: number | null | undefined, currency = "AED"): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${currency} ${v.toLocaleString("en-US")}`;
}

function orDash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

// ----------------------------------------------------------------------------
// Reusable drawing primitives
// ----------------------------------------------------------------------------

type Doc = PDFKit.PDFDocument;

function drawHeader(doc: Doc, company: CompanyInfo, title: string, reference?: string | null): void {
  const top = doc.y;

  // Company name
  doc
    .fillColor(COLOR_ACCENT)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(company.name, PAGE_MARGIN, top);

  // Company sub-details
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED);
  const subLines: string[] = [];
  if (company.addressLines?.length) subLines.push(...company.addressLines);
  const contact: string[] = [];
  if (company.phone) contact.push(`Tel: ${company.phone}`);
  if (company.email) contact.push(company.email);
  if (contact.length) subLines.push(contact.join("   "));
  if (company.trn) subLines.push(`TRN: ${company.trn}`);
  if (subLines.length) {
    doc.moveDown(0.3);
    doc.text(subLines.join("\n"), { lineGap: 1 });
  }

  // Document title (right-aligned block under the name)
  doc.moveDown(0.8);
  const titleY = doc.y;
  doc
    .fillColor(COLOR_TEXT)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(title.toUpperCase(), PAGE_MARGIN, titleY);

  if (reference) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .text(`Ref: ${reference}`, PAGE_MARGIN, titleY + 2, {
        align: "right",
        width: doc.page.width - PAGE_MARGIN * 2,
      });
  }

  doc.moveDown(0.6);
  hr(doc);
  doc.moveDown(0.8);
}

function hr(doc: Doc): void {
  const y = doc.y;
  doc
    .strokeColor(COLOR_LINE)
    .lineWidth(1)
    .moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .stroke();
}

function sectionTitle(doc: Doc, label: string): void {
  doc.moveDown(0.4);
  doc
    .fillColor(COLOR_ACCENT)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(label.toUpperCase());
  doc.moveDown(0.2);
}

/** Draws a two-column list of label/value rows. */
function fieldRows(doc: Doc, rows: Array<[string, string]>): void {
  const labelWidth = 140;
  const startX = PAGE_MARGIN;
  const valueX = PAGE_MARGIN + labelWidth;
  const valueWidth = doc.page.width - PAGE_MARGIN - valueX;

  for (const [label, value] of rows) {
    const rowY = doc.y;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text(label, startX, rowY, { width: labelWidth, continued: false });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_TEXT)
      .text(value, valueX, rowY, { width: valueWidth });
    doc.moveDown(0.35);
  }
}

function signatureBlock(doc: Doc): void {
  // Push signatures towards the bottom of the page if there is room.
  const minY = doc.page.height - 150;
  if (doc.y < minY) doc.y = minY;

  hr(doc);
  doc.moveDown(1.2);

  const colWidth = (doc.page.width - PAGE_MARGIN * 2 - 40) / 2;
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + colWidth + 40;
  const lineY = doc.y;

  // Signature lines
  doc
    .strokeColor(COLOR_TEXT)
    .lineWidth(0.75)
    .moveTo(leftX, lineY)
    .lineTo(leftX + colWidth, lineY)
    .stroke()
    .moveTo(rightX, lineY)
    .lineTo(rightX + colWidth, lineY)
    .stroke();

  doc.y = lineY + 6;
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED);
  doc.text("Company representative", leftX, doc.y, { width: colWidth });
  doc.text("Customer", rightX, lineY + 6, { width: colWidth });

  doc.moveDown(1.5);
  const dateY = doc.y;
  doc
    .strokeColor(COLOR_TEXT)
    .lineWidth(0.75)
    .moveTo(leftX, dateY)
    .lineTo(leftX + colWidth, dateY)
    .stroke()
    .moveTo(rightX, dateY)
    .lineTo(rightX + colWidth, dateY)
    .stroke();
  doc.y = dateY + 6;
  doc.text("Date", leftX, doc.y, { width: colWidth });
  doc.text("Date", rightX, dateY + 6, { width: colWidth });
}

function footer(doc: Doc): void {
  const y = doc.page.height - 40;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR_MUTED)
    .text(
      "This document was generated electronically by TAKE Auto. It is valid without a stamp.",
      PAGE_MARGIN,
      y,
      { width: doc.page.width - PAGE_MARGIN * 2, align: "center" },
    );
}

// ----------------------------------------------------------------------------
// Core: turn a builder callback into a Buffer.
// ----------------------------------------------------------------------------

function renderToBuffer(build: (doc: Doc) => void): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: PAGE_MARGIN,
        bufferPages: true,
        info: { Producer: "TAKE Auto Driver Bot", Creator: "TAKE Auto Driver Bot" },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      build(doc);
      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ----------------------------------------------------------------------------
// Public: Acceptance Act
// ----------------------------------------------------------------------------

export function generateAcceptanceAct(data: AcceptanceActData): Promise<Buffer> {
  const title =
    data.kind === "return" ? "Vehicle Return Acceptance Act" : "Vehicle Handover Acceptance Act";

  return renderToBuffer((doc) => {
    drawHeader(doc, data.company, title, data.reference);

    const partyRole =
      data.kind === "return" ? "returned by the customer" : "handed over to the customer";
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_TEXT)
      .text(
        `This act confirms the condition of the vehicle at the time it was ${partyRole}, ` +
          `as recorded on ${fmtDate(data.date ?? new Date())}.`,
        { align: "left" },
      );

    sectionTitle(doc, "Vehicle");
    fieldRows(doc, [
      ["Make / Model", `${orDash(data.vehicle.make)} ${orDash(data.vehicle.model)}`.trim()],
      ["Plate", orDash(data.vehicle.plate)],
      ["Year", orDash(data.vehicle.year ?? undefined)],
    ]);

    sectionTitle(doc, "Customer");
    fieldRows(doc, [
      ["Name", orDash(data.customer.name)],
      ["Phone", orDash(data.customer.phone ?? undefined)],
    ]);

    sectionTitle(doc, "Condition");
    fieldRows(doc, [
      ["Odometer (km)", orDash(data.condition.odometer ?? undefined)],
      ["Fuel level", orDash(data.condition.fuel ?? undefined)],
      ["Date recorded", fmtDate(data.date ?? new Date())],
    ]);

    if (data.condition.notes) {
      sectionTitle(doc, "Notes");
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(COLOR_TEXT)
        .text(data.condition.notes, { width: doc.page.width - PAGE_MARGIN * 2 });
    }

    // Legal clause (e.g. no responsibility for items left in the vehicle).
    if (data.itemsClause) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLOR_MUTED)
        .text(data.itemsClause, { width: doc.page.width - PAGE_MARGIN * 2 });
    }

    // Embedded car photos (grid, 2 per row, new page as needed).
    if (data.photos && data.photos.length) {
      sectionTitle(doc, "Vehicle Photos");
      const usableW = doc.page.width - PAGE_MARGIN * 2;
      const cellW = (usableW - 12) / 2;
      const cellH = cellW * 0.7;
      let col = 0;
      for (const p of data.photos) {
        if (doc.y + cellH + 16 > doc.page.height - PAGE_MARGIN) { doc.addPage(); }
        const x = PAGE_MARGIN + col * (cellW + 12);
        const yTop = doc.y;
        try { doc.image(p.image, x, yTop, { fit: [cellW, cellH], align: "center" }); }
        catch { /* skip unreadable image */ }
        doc.font("Helvetica").fontSize(7).fillColor(COLOR_MUTED)
          .text(p.label, x, yTop + cellH + 2, { width: cellW });
        col++;
        if (col === 2) { col = 0; doc.y = yTop + cellH + 16; doc.x = PAGE_MARGIN; }
        else { doc.y = yTop; }
      }
      if (col === 1) doc.y += cellH + 16;
    }

    signatureBlock(doc);
    footer(doc);
  });
}

// ----------------------------------------------------------------------------
// Public: Rental Contract
// ----------------------------------------------------------------------------

export function generateRentalContract(data: RentalContractData): Promise<Buffer> {
  const currency = data.terms.currency ?? "AED";

  return renderToBuffer((doc) => {
    drawHeader(doc, data.company, "Rental Contract", data.reference);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_TEXT)
      .text(
        `This rental contract is entered into between ${data.company.name} (the "Company") and ` +
          `the customer named below (the "Renter"), on ${fmtDate(data.date ?? new Date())}, ` +
          `for the vehicle and terms set out herein.`,
        { align: "left" },
      );

    sectionTitle(doc, "Vehicle");
    fieldRows(doc, [
      ["Make / Model", `${orDash(data.vehicle.make)} ${orDash(data.vehicle.model)}`.trim()],
      ["Plate", orDash(data.vehicle.plate)],
      ["Year", orDash(data.vehicle.year ?? undefined)],
    ]);

    sectionTitle(doc, "Renter");
    fieldRows(doc, [
      ["Name", orDash(data.customer.name)],
      ["Phone", orDash(data.customer.phone ?? undefined)],
    ]);

    sectionTitle(doc, "Rental Terms");
    fieldRows(doc, [
      ["Start date", fmtDate(data.terms.startDate)],
      ["Return date", fmtDate(data.terms.returnDate)],
      ["Total days", orDash(data.terms.totalDays ?? undefined)],
      ["Daily rate", fmtMoney(data.terms.dailyRate, currency)],
      ["Deposit", fmtMoney(data.terms.deposit, currency)],
      ["Total", fmtMoney(data.terms.total, currency)],
    ]);

    sectionTitle(doc, "Terms & Conditions");
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLOR_MUTED)
      .text(
        "1. The Renter confirms possession of a valid driving licence and is solely responsible " +
          "for all traffic and Salik/toll charges during the rental period. " +
          "2. The vehicle must be returned in the same condition, subject to normal wear. " +
          "3. The deposit is refundable after inspection, less any damages, fines or outstanding balance. " +
          "4. Late return is charged at the daily rate. " +
          "5. This agreement is governed by the applicable laws of the United Arab Emirates.",
        { width: doc.page.width - PAGE_MARGIN * 2, lineGap: 1.5 },
      );

    signatureBlock(doc);
    footer(doc);
  });
}

// ----------------------------------------------------------------------------
// Public: save-to-disk helper
// ----------------------------------------------------------------------------

/**
 * Writes a PDF buffer to `dir/filename`, creating `dir` if needed.
 * Returns the absolute path written.
 */
export async function savePdf(buffer: Buffer, dir: string, filename: string): Promise<string> {
  await fs.mkdir(dir, { recursive: true });
  const safe = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const full = path.resolve(dir, safe);
  await fs.writeFile(full, buffer);
  return full;
}

/** Convenience: build a filesystem-safe filename from parts. */
export function makeFilename(...parts: Array<string | number | null | undefined>): string {
  const base = parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .map((p) => String(p))
    .join("_")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "document";
}
