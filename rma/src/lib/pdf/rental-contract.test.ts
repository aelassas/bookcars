import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildRentalContractPdf, missingRentalContractFields, type RentalContractPdfData } from "./rental-contract";

const valid: RentalContractPdfData = {
  reference: "36ACBA19",
  companyName: "RMA Car Rental LLC S.O.C",
  customerName: "Tom Alain Daniel",
  customerPhone: "+971585613085",
  customerDob: "1990-01-02",
  customerNationality: "French",
  customerAddress: "Dubai",
  customerPassport: "P1234567",
  customerLicenseNumber: "1234567",
  customerLicenseIssue: "2022-01-01",
  customerLicenseExpiry: "2030-01-01",
  vehicleMake: "Mercedes-Benz",
  vehicleModel: "CLA250",
  vehiclePlate: "GG 31235",
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

describe("RMA rental contract", () => {
  it("blocks generation until legal data is reviewed and complete", () => {
    expect(missingRentalContractFields({ ...valid, exitOdometer: null, customerPassport: null, customerEid: null }))
      .toEqual(expect.arrayContaining(["contract start odometer", "Emirates ID or passport"]));
    expect(missingRentalContractFields(valid)).toEqual([]);
  });

  it("uses the one-page RMA form and removes the sample signature field", async () => {
    const bytes = await buildRentalContractPdf(valid);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getForm().getFields()).toEqual([]);
    expect(pdf.getTitle()).toBe("RMA Vehicle Rental Contract 36ACBA19");
  });
});
