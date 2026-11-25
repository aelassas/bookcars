import { mkdir, writeFile } from "node:fs/promises";
import { buildRentalContractPdf, type RentalContractPdfData } from "../src/lib/pdf/rental-contract";

const sample: RentalContractPdfData = {
  reference: "36ACBA19",
  companyName: "RMA Car Rental LLC S.O.C",
  customerName: "Tom Alain Daniel",
  customerPhone: "+971585613085",
  customerDob: "1990-01-02",
  customerNationality: "French",
  customerAddress: "Dubai",
  customerEid: "784199012345671",
  customerEidIssue: "2024-01-01",
  customerEidExpiry: "2028-01-01",
  customerPassport: "P1234567",
  customerPassportIssue: "2022-01-01",
  customerPassportExpiry: "2032-01-01",
  customerLicenseNumber: "1234567",
  customerLicenseIssue: "2022-01-01",
  customerLicenseExpiry: "2030-01-01",
  vehicleMake: "Mercedes-Benz",
  vehicleModel: "CLA250",
  vehiclePlate: "GG 31235",
  vehicleYear: 2025,
  vehicleColour: "Black",
  exitOdometer: 8115,
  exitFuelPercent: 70,
  startDate: new Date("2026-11-16T14:30:00Z"),
  returnDate: new Date("2026-12-02T14:30:00Z"),
  totalDays: 16,
  dailyRate: 285,
  deposit: 1500,
  rentalSubtotal: 4560,
  dailyKmLimit: "150",
};

async function main() {
  const pdf = await buildRentalContractPdf(sample);
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/rma-contract-preview.pdf", pdf);
  console.log(`wrote tmp/pdfs/rma-contract-preview.pdf (${pdf.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
