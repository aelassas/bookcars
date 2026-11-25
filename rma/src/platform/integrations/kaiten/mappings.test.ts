import { describe, expect, it } from "vitest";
import { normalizePlate, parseCardPlate, extractCardPhotos } from "./mappings";
import type { KaitenFile } from "./client";

// Real Kaiten card titles from production. Every one of these is a board card
// for a car, and not one of them names a plate — which is the whole reason the
// sync must not turn a card into a `vehicle` row. The cases below are the ones
// that a looser "digits followed by letters" plate heuristic actually matched
// when it was tried against all 163 live cards; each match was a trim code.
const LIVE_TITLES_WITHOUT_PLATES = [
  "BMW 420i 2025",
  "BMW X5 xDrive 40i 2025",
  "BMW 520i 2024 Black",
  "BMW 320i 2024 Grey",
  "BMW 120i 2022",
  "McLaren 720S 2022",
  "Mercedes GLC 300E 2021",
  "Exeed RX Flagship 2025 (in service on 9th of july)",
  "KIA K5 2024",
  "BMW X6M 2021",
  "Jetour T2 2026",
  "Mercedes-Benz G63 2023 (Brabus kit)",
  "Tesla Model 3 2023",
  "Porsche 911 Carrera 4GTS 2025",
  "Rolls Royce Cullinan 2023",
  "Nissan Navara 2020",
];

describe("parseCardPlate", () => {
  it("returns null for every real Kaiten card title", () => {
    for (const title of LIVE_TITLES_WITHOUT_PLATES) {
      expect(parseCardPlate(title), title).toBeNull();
    }
  });

  it("reads a plate only when the card labels it as one", () => {
    expect(parseCardPlate("Tesla Model Y — plate 46423 EE")).toBe("46423 EE");
    expect(parseCardPlate("Nissan Patrol", "Plate: 14465 Y")).toBe("14465 Y");
    expect(parseCardPlate("Mercedes", "plate no: DXB 46423 EE")).toBe("DXB 46423 EE");
    expect(parseCardPlate("Toyota Camry", "номер 24787 G")).toBe("24787 G");
  });

  it("does not treat a bare number-letter token as a plate", () => {
    // No label, so no plate — even though the shape is right. Guessing here is
    // what forks one real car into two fleet rows.
    expect(parseCardPlate("Nissan Patrol 14465 Y")).toBeNull();
  });

  it("ignores empty and missing fields", () => {
    expect(parseCardPlate(undefined, null, "   ")).toBeNull();
  });
});

describe("normalizePlate", () => {
  it("compares plates ignoring case and separators", () => {
    expect(normalizePlate("46423 EE")).toBe("46423EE");
    expect(normalizePlate("46423-ee")).toBe(normalizePlate("46423 EE"));
  });
});

describe("extractCardPhotos", () => {
  const img = (over: Partial<KaitenFile>): KaitenFile => ({
    id: 1,
    url: "https://files.kaiten.ru/a.jpeg",
    name: "a.jpeg",
    type: 1,
    ...over,
  });

  it("returns [] for no files", () => {
    expect(extractCardPhotos(undefined)).toEqual([]);
    expect(extractCardPhotos(null)).toEqual([]);
    expect(extractCardPhotos([])).toEqual([]);
  });

  it("keeps images (type 1 / image mime / image extension) and drops the rest", () => {
    const files: KaitenFile[] = [
      img({ id: 1, url: "https://files.kaiten.ru/a.jpeg", name: "a.jpeg", type: 1 }),
      img({ id: 2, url: "https://files.kaiten.ru/b.pdf", name: "contract.pdf", type: 2, mime_type: "application/pdf" }),
      img({ id: 3, url: "https://files.kaiten.ru/c", name: "c.png", type: 0, mime_type: null }),
      img({ id: 4, url: "https://files.kaiten.ru/d", name: "d", type: 0, mime_type: "image/webp" }),
    ];
    const out = extractCardPhotos(files);
    expect(out.map((p) => p.name).sort()).toEqual(["a.jpeg", "c.png", "d"]);
  });

  it("drops deleted files and floats the card cover to the front", () => {
    const files: KaitenFile[] = [
      img({ id: 1, name: "second.jpeg", sort_order: 2 }),
      img({ id: 2, name: "gone.jpeg", deleted: true }),
      img({ id: 3, name: "cover.jpeg", sort_order: 9, card_cover: true }),
      img({ id: 4, name: "first.jpeg", sort_order: 1 }),
    ];
    const out = extractCardPhotos(files);
    expect(out.map((p) => p.name)).toEqual(["cover.jpeg", "first.jpeg", "second.jpeg"]);
  });

  it("caps the gallery at 12", () => {
    const files = Array.from({ length: 20 }, (_, i) => img({ id: i, name: `p${i}.jpeg`, sort_order: i }));
    expect(extractCardPhotos(files)).toHaveLength(12);
  });
});
