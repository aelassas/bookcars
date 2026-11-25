// Pilot vehicle name normaliser.
//
// Pilot's `model` field is messy: some rows are English ("Mercedes-Benz G-Class",
// "Kia Sportage"), some are Cyrillic ("Тойота", "Мерседес"), and some are
// placeholders ("Car", "Машина", empty) with the actual make hiding in the
// plate string ("H99779 BMW M8"). This module canonicalises any of those into
// { make, model } where `make` is the canonical English brand display name
// (e.g. "BMW", "Mercedes-Benz"). It is the single source of brand-detection
// truth — brand-logos.ts and the FleetView render call this.

export interface Brand {
  // Filename slug under public/brand-logos/.
  slug: string;
  // Canonical display name, used as `make` in the rest of the app.
  display: string;
  // English brand-name spellings. Used for both detection AND stripping.
  brandRe: RegExp;
  // Cyrillic spellings. Used for both detection AND stripping.
  cyrillicRe?: RegExp;
  // Model words that imply the brand. Detection only — never stripped, so
  // a name like "Land Cruiser" still returns "Land Cruiser" as the model.
  modelHints?: RegExp;
}

// Ordered: multi-word / model-prefixed brands first so they win the
// alternation race. `\b` is ASCII-only in JS regex, so short Cyrillic
// abbreviations rely on the rarity of cross-word collisions.
export const BRANDS: Brand[] = [
  { slug: "mercedes-benz", display: "Mercedes-Benz", brandRe: /mercedes[-\s]?benz|mercedes|maybach/i, cyrillicRe: /мерседес[-\s]?бенц|мерседес/i },
  { slug: "range-rover", display: "Range Rover", brandRe: /range[-\s]rover/i, cyrillicRe: /рендж[-\s]?ровер/i },
  { slug: "land-rover", display: "Land Rover", brandRe: /land[-\s]rover/i, cyrillicRe: /ленд[-\s]?ровер|лэнд[-\s]?ровер/i, modelHints: /\bdefender\b|\bevoque\b/i },
  { slug: "bmw", display: "BMW", brandRe: /\bbmw\b/i, cyrillicRe: /бмв/i },
  { slug: "audi", display: "Audi", brandRe: /\baudi\b/i, cyrillicRe: /ауди/i, modelHints: /\brs ?[3-8]\b/i },
  { slug: "toyota", display: "Toyota", brandRe: /toyota/i, cyrillicRe: /тойота/i, modelHints: /land cruiser|\bcamry\b|\bveloz\b|\braize\b|\bhilux\b|\bcorolla\b|\bfortuner\b|\bprado\b/i },
  { slug: "nissan", display: "Nissan", brandRe: /nissan/i, cyrillicRe: /ниссан/i, modelHints: /\bpatrol\b|\bxterra\b|\baltima\b/i },
  { slug: "infiniti", display: "Infiniti", brandRe: /infiniti/i, cyrillicRe: /инфинити/i },
  { slug: "kia", display: "Kia", brandRe: /\bkia\b/i, cyrillicRe: /киа/i, modelHints: /\bsonet\b|\bsportage\b|\bseltos\b/i },
  { slug: "hyundai", display: "Hyundai", brandRe: /hyundai/i, cyrillicRe: /хендай|хёндай|хундай|хюндай/i, modelHints: /\bsonata\b|\belantra\b|\baccent\b|\bvenue\b|\btucson\b/i },
  { slug: "genesis", display: "Genesis", brandRe: /genesis/i, cyrillicRe: /дженезис/i },
  { slug: "chevrolet", display: "Chevrolet", brandRe: /chevrolet/i, cyrillicRe: /шевроле/i, modelHints: /\bmalibu\b|\bcaptiva\b|\btrailblazer\b|\btahoe\b/i },
  { slug: "gmc", display: "GMC", brandRe: /\bgmc\b/i, cyrillicRe: /джи[-\s]?эм[-\s]?си/i, modelHints: /\bsierra\b|\byukon\b/i },
  { slug: "ford", display: "Ford", brandRe: /\bford\b/i, cyrillicRe: /форд/i, modelHints: /\bbronco\b|\bmustang\b|\beverest\b|\braptor\b/i },
  { slug: "jeep", display: "Jeep", brandRe: /\bjeep\b/i, cyrillicRe: /джип/i, modelHints: /\bwrangler\b/i },
  { slug: "cadillac", display: "Cadillac", brandRe: /cadillac/i, cyrillicRe: /кадиллак/i, modelHints: /\bescalade\b/i },
  { slug: "porsche", display: "Porsche", brandRe: /porsche/i, cyrillicRe: /порше/i, modelHints: /\bcayman\b|\bmacan\b|\bpanamera\b|\btaycan\b/i },
  { slug: "mclaren", display: "McLaren", brandRe: /mclaren/i, cyrillicRe: /макларен/i },
  { slug: "bentley", display: "Bentley", brandRe: /bentley/i, cyrillicRe: /бентли/i, modelHints: /\bbentayga\b/i },
  { slug: "lamborghini", display: "Lamborghini", brandRe: /lamborghini/i, cyrillicRe: /ламборгини/i, modelHints: /\burus\b|\bhuracan\b|\baventador\b/i },
  { slug: "lexus", display: "Lexus", brandRe: /lexus/i, cyrillicRe: /лексус/i },
  { slug: "volkswagen", display: "Volkswagen", brandRe: /volkswagen|\bvw\b/i, cyrillicRe: /фольксваген/i, modelHints: /\bgolf\b/i },
  { slug: "tesla", display: "Tesla", brandRe: /tesla/i, cyrillicRe: /тесла/i },
  { slug: "mini", display: "Mini", brandRe: /\bmini\b/i, cyrillicRe: /\bмини\b/i },
  { slug: "mitsubishi", display: "Mitsubishi", brandRe: /mitsubishi/i, cyrillicRe: /митсубиси|мицубиси/i, modelHints: /\bpajero\b|\bxpander\b/i },
  { slug: "mazda", display: "Mazda", brandRe: /mazda/i, cyrillicRe: /мазда/i },
  { slug: "honda", display: "Honda", brandRe: /honda/i, cyrillicRe: /хонда/i, modelHints: /\baccord\b|\bcivic\b/i },
  { slug: "renault", display: "Renault", brandRe: /renault/i, cyrillicRe: /рено/i, modelHints: /\bduster\b/i },
  { slug: "suzuki", display: "Suzuki", brandRe: /suzuki/i, cyrillicRe: /сузуки/i, modelHints: /\bbaleno\b|\bertiga\b|\bjimny\b/i },
  { slug: "jetour", display: "Jetour", brandRe: /jetour/i, cyrillicRe: /джитур|джетур/i, modelHints: /\bdashing\b/i },
  { slug: "exeed", display: "Exeed", brandRe: /exeed/i, cyrillicRe: /эксид/i },
  { slug: "gac", display: "GAC", brandRe: /\bgac\b/i, cyrillicRe: /\bгак\b/i },
  { slug: "chery", display: "Chery", brandRe: /chery/i, cyrillicRe: /чери/i },
  { slug: "mg", display: "MG", brandRe: /\bmg\b/i, cyrillicRe: /\bэм[-\s]?джи\b/i },
  { slug: "byd", display: "BYD", brandRe: /\bbyd\b/i, cyrillicRe: /\bбид\b|байди/i },
];

const GENERIC_NAME_RE = /^(car|машина|тс|vehicle|n\/?a|none|unknown|—|-)$/i;

function detectBrand(text: string): Brand | null {
  if (!text) return null;
  for (const b of BRANDS) {
    if (b.brandRe.test(text)) return b;
    if (b.cyrillicRe && b.cyrillicRe.test(text)) return b;
    if (b.modelHints && b.modelHints.test(text)) return b;
  }
  return null;
}

// Removes the brand's English and Cyrillic spellings from `text`, leaving
// what's left (the model). Does NOT strip modelHints — those are model words.
function stripBrandWords(text: string, brand: Brand): string {
  let s = text.replace(new RegExp(brand.brandRe.source, "gi"), "");
  if (brand.cyrillicRe) {
    s = s.replace(new RegExp(brand.cyrillicRe.source, "gi"), "");
  }
  return s.replace(/^[\s\-,·]+|[\s\-,·]+$/g, "").trim();
}

const PLATE_CODE_RE = /^[A-Za-z0-9-]+/;

// The leading alphanumeric token of a plate string ("AA81643 Land Cruiser"
// -> "AA81643"). Handles dashes ("W-81035") but not internal spaces ("T- 58019"
// loses everything after the dash).
export function plateCode(plate: string): string {
  const m = plate.trim().match(PLATE_CODE_RE);
  return m ? m[0] : "";
}

// Returns the model portion of a plate string after stripping the plate code
// and the brand's spellings. e.g. "H99779 BMW M8" + BMW -> "M8".
function extractModelFromPlate(plate: string, brand: Brand): string {
  const code = plateCode(plate);
  let rest = plate.trim();
  if (code) rest = rest.slice(code.length).trim();
  rest = stripBrandWords(rest, brand);
  // Pilot occasionally annotates plates with parenthetical notes —
  // "(removed)", "(Basic hybrid)", "(Ign Checkup)". Keep the bracketed
  // model info but drop housekeeping markers.
  rest = rest
    .replace(/\s*\(\s*(removed|basic|ign checkup|cutoff)[^)]*\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return rest;
}

export interface NormalizedVehicle {
  make: string;
  model: string;
}

// Canonicalises a Pilot row's name into { make, model } with the make as the
// English display brand. Handles Cyrillic brand words and falls back to the
// plate string when `name` is a placeholder ("Car", "Машина", empty).
export function normalizePilotVehicle({
  name = "",
  plate = "",
}: {
  name?: string | null;
  plate?: string | null;
}): NormalizedVehicle {
  const nameTrim = (name ?? "").trim();
  const plateTrim = (plate ?? "").trim();
  const isGeneric = !nameTrim || GENERIC_NAME_RE.test(nameTrim);

  if (!isGeneric) {
    const brand = detectBrand(nameTrim);
    if (brand) {
      let model = stripBrandWords(nameTrim, brand);
      // If the name was just the brand (e.g. "Тойота", "Bentley"), the model
      // is empty. Try recovering it from the plate string.
      if (!model && plateTrim) {
        model = extractModelFromPlate(plateTrim, brand);
      }
      return { make: brand.display, model };
    }
    // Unknown brand. Fall back to a first-space split so at least the shape
    // is right. No canonicalisation is possible here.
    const sp = nameTrim.indexOf(" ");
    if (sp > 0) {
      return {
        make: nameTrim.slice(0, sp),
        model: nameTrim.slice(sp + 1).trim(),
      };
    }
    return { make: nameTrim, model: "" };
  }

  // Generic name — sniff the plate for a brand keyword.
  if (plateTrim) {
    const brand = detectBrand(plateTrim);
    if (brand) {
      return {
        make: brand.display,
        model: extractModelFromPlate(plateTrim, brand),
      };
    }
  }

  return { make: "", model: "" };
}

// Slug for `make` (the display name). Used by brand-logos.ts to build the
// PNG path. Range Rover aliases to land-rover since the dataset only has
// the Land Rover oval.
export function brandSlug(make: string): string {
  const lowered = make.trim().toLowerCase();
  if (!lowered) return "";
  if (lowered === "range rover") return "land-rover";
  const exact = BRANDS.find((b) => b.display.toLowerCase() === lowered);
  if (exact) return exact.slug;
  return lowered.replace(/\s+/g, "-");
}

// Back-compat wrapper for brand-logos.ts callers that pass a raw vehicle name
// and just want the slug.
export function slugFromName(name: string): string | null {
  const { make } = normalizePilotVehicle({ name });
  return make ? brandSlug(make) : null;
}
