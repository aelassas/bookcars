// scripts/render-sample-contract.ts
// Renders the rental contract with realistic dummy data for visual review.
//   npx tsx scripts/render-sample-contract.ts
// Writes /tmp/sample-contract.pdf.
import { writeFile } from "node:fs/promises";
import { buildRentalContractPdf, type RentalContractPdfData } from "../src/lib/pdf/rental-contract";

const start = new Date("2026-07-18T10:30:00Z");
const end = new Date("2026-07-25T10:30:00Z");

const sample: RentalContractPdfData = {
  reference: "RNT-2026-0417",
  companyName: "Cardiwan Rent a Car LLC",
  companySlug: "cardiwan",

  customerName: "Ahmed Karim Haddad",
  customerPhone: "+971 50 412 7788",
  customerDob: new Date("1991-03-14T00:00:00Z"),
  customerNationality: "Lebanese",
  customerEid: "784-1991-4471203-9",
  customerPassport: "LR2214877",
  customerLicenseNumber: "DXB-1188342",
  customerLicenseIssue: new Date("2022-09-01T00:00:00Z"),
  customerLicenseExpiry: new Date("2027-09-01T00:00:00Z"),

  vehicleMake: "Nissan",
  vehicleModel: "Sunny 1.6 SV",
  vehiclePlate: "DXB J 48219",
  vehicleYear: 2024,
  vehicleColour: "White",
  exitOdometer: 41250,
  exitFuelPercent: 100,
  returnOdometer: null,
  returnFuelPercent: null,

  startDate: start,
  returnDate: end,
  totalDays: 7,
  dailyRate: 130,
  deposit: 1500,
  rentalSubtotal: 910,
  address: "Al Quoz Industrial 3, Warehouse 12, Dubai",

  exitRemarks: "Minor scratch on rear left bumper, noted at handover.",
  returnRemarks: null,
};

async function main(): Promise<void> {
  const pdf = await buildRentalContractPdf(sample);
  await writeFile("/tmp/sample-contract.pdf", pdf);
  console.log(`wrote /tmp/sample-contract.pdf (${pdf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
