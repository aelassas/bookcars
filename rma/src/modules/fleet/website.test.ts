import { describe, expect, it } from "vitest";
import { publicPhotoUrl } from "./website";

describe("public website photos", () => {
  it("allows public HTTPS photos and resolves managed uploads", () => {
    expect(publicPhotoUrl("https://cdn.example.com/car.jpg")).toBe("https://cdn.example.com/car.jpg");
    expect(publicPhotoUrl("/site-cars/car.jpg")).toBe("https://crm.rma.network/site-cars/car.jpg");
  });

  it("rejects local paths, scripts and non-image data", () => {
    expect(publicPhotoUrl("/api/files/private")).toBeNull();
    expect(publicPhotoUrl("javascript:alert(1)")).toBeNull();
    expect(publicPhotoUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
  });
});
