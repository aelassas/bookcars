import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export interface RentalContractPdfData {
  reference: string;
  companyName: string;
  companySlug?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerDob?: Date | string | null;
  customerNationality?: string | null;
  customerAddress?: string | null;
  customerEid?: string | null;
  customerEidIssue?: Date | string | null;
  customerEidExpiry?: Date | string | null;
  customerPassport?: string | null;
  customerPassportIssue?: Date | string | null;
  customerPassportExpiry?: Date | string | null;
  customerLicenseNumber?: string | null;
  customerLicenseIssue?: Date | string | null;
  customerLicenseExpiry?: Date | string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear?: number | null;
  vehicleColour?: string | null;
  exitOdometer?: number | null;
  exitFuelPercent?: number | null;
  returnOdometer?: number | null;
  returnFuelPercent?: number | null;
  startDate: Date | null;
  returnDate: Date | null;
  actualReturnDate?: Date | null;
  totalDays: number | null;
  dailyRate: number | null;
  deposit: number | null;
  rentalSubtotal: number | null;
  address?: string | null;
  dailyKmLimit?: string | null;
  extraKmFee?: string | null;
  tollGate?: string | null;
  additionalGps?: string | null;
  childSeat?: string | null;
  recoveryFee?: string | null;
  exitRemarks?: string | null;
  returnRemarks?: string | null;
}

export function missingRentalContractFields(data: RentalContractPdfData): string[] {
  const missing: string[] = [];
  if (!data.customerName.trim()) missing.push("customer name");
  if (!data.customerPhone?.trim()) missing.push("customer phone");
  if (!data.customerDob) missing.push("date of birth");
  if (!data.customerNationality?.trim()) missing.push("nationality");
  if (!data.customerEid?.trim() && !data.customerPassport?.trim()) missing.push("Emirates ID or passport");
  if (!data.customerLicenseNumber?.trim()) missing.push("driving licence number");
  if (!data.customerLicenseExpiry) missing.push("driving licence expiry");
  if (!data.vehicleMake.trim() || !data.vehicleModel.trim() || !data.vehiclePlate.trim()) missing.push("vehicle identity");
  if (data.exitOdometer == null) missing.push("contract start odometer");
  if (!data.startDate || !data.returnDate || !data.totalDays || !data.dailyRate) missing.push("rental dates and rate");
  if (!data.dailyKmLimit?.trim()) missing.push("daily mileage limit");
  return missing;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dubaiDateParts(value: Date | string | null | undefined) {
  const parsed = toDate(value);
  if (!parsed) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function date(value: Date | string | null | undefined): string {
  const parts = dubaiDateParts(value);
  return parts ? `${parts.year}.${parts.month}.${parts.day}` : "";
}

function time(value: Date | string | null | undefined): string {
  const parts = dubaiDateParts(value);
  return parts ? `${parts.hour}:${parts.minute}` : "";
}

function text(value: string | number | null | undefined): string {
  return value == null ? "" : String(value).trim();
}

function emiratesId(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 15 ? `784-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}` : text(value);
}

function templatePath(): string {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "pdf", "assets", "rma-contract-template.png"),
    path.join(process.cwd(), "rma", "src", "lib", "pdf", "assets", "rma-contract-template.png"),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error("RMA contract template is missing");
  return resolved;
}

function fitText(page: PDFPage, value: string, options: { x: number; baseline: number; width: number; size?: number; font: PDFFontLike }) {
  if (!value) return;
  const size = options.size ?? 7;
  const maxWidth = options.width;
  const width = options.font.widthOfTextAtSize(value, size);
  const actualSize = width > maxWidth ? Math.max(5, size * maxWidth / width) : size;
  page.drawText(value, {
    x: options.x,
    y: page.getHeight() - options.baseline,
    size: actualSize,
    font: options.font,
    color: rgb(0.08, 0.08, 0.08),
    maxWidth,
  });
}

type PDFFontLike = Awaited<ReturnType<PDFDocument["embedFont"]>>;

export async function buildRentalContractPdf(data: RentalContractPdfData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([594.96, 841.92]);
  const background = await pdf.embedPng(await readFile(templatePath()));
  page.drawImage(background, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const value = (input: string | null | undefined, x: number, baseline: number, width = 115, size?: number) =>
    fitText(page, input ?? "", { x, baseline, width, size, font });

  value(date(data.startDate), 42, 154, 55);
  value(time(data.startDate), 99, 154, 35);
  value(dubaiDateParts(data.startDate)?.year, 568, 105, 27);
  value(data.reference, 405, 152, 75);
  value(data.vehicleMake, 120, 181);
  value(data.vehicleModel, 120, 191);
  value(data.vehicleColour, 120, 202);
  value(data.vehiclePlate, 120, 213);
  value(data.exitOdometer == null ? "" : String(Math.round(data.exitOdometer)), 120, 223);
  value(data.dailyKmLimit ?? "", 120, 233);
  value(data.extraKmFee ?? "3 /km", 120, 243);
  value(data.exitFuelPercent == null ? "" : `${Math.round(data.exitFuelPercent)} %`, 120, 253);
  const monthly = Boolean(data.totalDays && data.totalDays >= 28 && data.totalDays <= 31);
  value(monthly ? "monthly" : "daily", 120, 263);
  const rate = monthly ? data.rentalSubtotal : data.dailyRate;
  value(rate == null ? "" : `${rate.toLocaleString("en-US")} AED / ${monthly ? "monthly" : "daily"}`, 112, 273, 122, 6.5);
  value(`${date(data.startDate)}  ${time(data.startDate)}`.trim(), 120, 283);
  value(`${date(data.returnDate)}  ${time(data.returnDate)}`.trim(), 120, 293);
  value(`${date(data.actualReturnDate)}  ${time(data.actualReturnDate)}`.trim(), 120, 303);

  value(data.customerName, 392, 181, 128);
  value(data.customerNationality, 392, 192, 128);
  value(date(data.customerDob), 392, 203, 128);
  value(data.customerPhone, 392, 214, 128);
  value(data.customerAddress ?? data.address, 392, 224, 128);
  value(data.customerLicenseNumber, 392, 234, 128);
  value("", 392, 245, 128);
  value(date(data.customerLicenseIssue), 392, 254, 128);
  value(date(data.customerLicenseExpiry), 392, 264, 128);
  value(data.customerPassport, 392, 275, 128);
  value(date(data.customerPassportIssue), 392, 285, 128);
  value(date(data.customerPassportExpiry), 392, 295, 128);
  value(emiratesId(data.customerEid), 392, 305, 128);
  value(date(data.customerEidIssue), 392, 315, 128);
  value(date(data.customerEidExpiry), 392, 325, 128);

  pdf.setTitle(`RMA Vehicle Rental Contract ${data.reference}`);
  pdf.setAuthor("RMA Car Rental LLC S.O.C");
  pdf.setCreator("RMA CRM");
  pdf.setProducer("RMA CRM");
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());
  return Buffer.from(await pdf.save());
}
