// ============================================================================
// contract-fill.ts — fill a company's OFFICIAL rental contract PDF and apply
// the company stamp (= "signed by the company"), using pdf-lib to overlay text
// + the stamp image onto the branded template. Template & stamp are chosen by
// the vehicle's company (see config.ts). Output is the signed contract bytes.
// ============================================================================

import { promises as fs } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { contractForCompany, type CompanyContract } from "./config";

export interface ContractData {
  contractNo?: string;
  // driver (from OCR)
  firstName?: string; lastName?: string; dob?: string; nationality?: string; mobile?: string;
  eid?: string; passport?: string; license?: string; issueDate?: string; expiryDate?: string;
  // vehicle
  make?: string; model?: string; plate?: string; colour?: string;
  // period / money
  dropOffDate?: string; dropOffTime?: string; pickupDate?: string; pickupTime?: string;
  ratePerDay?: string; totalDays?: string; totalPrice?: string; deposit?: string;
  odometer?: string; fuel?: string;
}

const s = (v: unknown): string => (v == null ? "" : String(v));

/**
 * Fill the company contract and stamp it. Returns the signed PDF bytes.
 * @param companySlug vehicle's company (cardiwan | etm)
 * @param data field values (OCR + rental)
 */
export async function fillContract(companySlug: string | null | undefined, data: ContractData): Promise<Buffer> {
  const cfg: CompanyContract = contractForCompany(companySlug);

  const templateBytes = await fs.readFile(cfg.templatePdf);
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  const put = (key: keyof ContractData) => {
    const pos = cfg.fields[key as string];
    const val = s(data[key]);
    if (!pos || !val) return;
    const page = pages[pos.page] ?? pages[0];
    page.drawText(val, { x: pos.x, y: pos.y, size: pos.size ?? 9, font, color: rgb(0.1, 0.1, 0.1) });
  };

  (Object.keys(data) as (keyof ContractData)[]).forEach(put);

  // Apply the company stamp = signed by the company.
  try {
    const stampBytes = await fs.readFile(cfg.stampPng);
    const stamp = await pdf.embedPng(stampBytes);
    const at = cfg.stampAt;
    const page = pages[at.page] ?? pages[0];
    const ratio = stamp.height / stamp.width;
    page.drawImage(stamp, { x: at.x, y: at.y, width: at.width, height: at.width * ratio, opacity: 0.9 });
  } catch (e) {
    console.warn(`[contract] stamp not applied (${cfg.slug}):`, (e as Error).message);
  }

  return Buffer.from(await pdf.save());
}

/**
 * Proof/calibration helper: fill with visible placeholder markers at every
 * field coordinate so positions can be tuned against a rendered page.
 */
export async function proofContract(companySlug: string): Promise<Buffer> {
  const cfg = contractForCompany(companySlug);
  const data: ContractData = {};
  (Object.keys(cfg.fields) as (keyof ContractData)[]).forEach((k) => { (data as Record<string, string>)[k as string] = `‹${k}›`; });
  return fillContract(companySlug, data);
}
