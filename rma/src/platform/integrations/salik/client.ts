const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const TIMEOUT_MS = 30_000;

export interface SalikJar {
  absorb(url: string, res: Response): void;
  header(url: string): string;
}

function makeJar(): SalikJar {
  const store = new Map<string, Map<string, string>>();
  const hostOf = (url: string) => new URL(url).hostname;
  return {
    absorb(url, res) {
      const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      if (!cookies.length) return;
      const host = hostOf(url);
      if (!store.has(host)) store.set(host, new Map());
      const jar = store.get(host)!;
      for (const cookie of cookies) {
        const [pair] = cookie.split(";");
        const eq = pair.indexOf("=");
        if (eq <= 0) continue;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (value === "") jar.delete(name);
        else jar.set(name, value);
      }
    },
    header(url) {
      const jar = store.get(hostOf(url));
      if (!jar) return "";
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
  };
}

async function req(jar: SalikJar, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    redirect: "manual",
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "User-Agent": UA,
      Cookie: jar.header(url),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  jar.absorb(url, res);
  return res;
}

export async function login(user: string, pass: string): Promise<SalikJar> {
  const jar = makeJar();
  let res = await req(jar, "https://customers.salik.ae/");
  let loginUrl = "";
  for (let hop = 0; hop < 8; hop++) {
    let location = res.headers.get("location") || "";
    if (!location) break;
    if (location.startsWith("/")) location = new URL(res.url).origin + location;
    res = await req(jar, location);
    if (res.url.includes("id.salik.ae") && res.status === 200) {
      loginUrl = res.url;
      break;
    }
  }
  if (!loginUrl) throw new Error("salik: never reached id.salik.ae login");

  res = await req(jar, loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ UserName: user, Password: pass }).toString(),
  });
  const authLocation = res.headers.get("location") || "";
  if (res.status !== 302 || !authLocation.includes("authorize")) {
    throw new Error(`salik: login rejected for ${user} (HTTP ${res.status})`);
  }

  res = await req(jar, authLocation.startsWith("http") ? authLocation : "https://id.salik.ae" + authLocation);
  const html = await res.text();
  const fields = [...html.matchAll(/name="([^"]+)" value="([^"]*)"/g)].map((match) => [match[1], match[2]] as [string, string]);
  if (!fields.length) throw new Error("salik: authorize page had no token form");

  res = await req(jar, "https://customers.salik.ae/Connect/SalikIdCallback", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
  if (!jar.header("https://customers.salik.ae/").includes(".ASPXAUTH")) {
    throw new Error("salik: no .ASPXAUTH after callback");
  }
  return jar;
}

async function getJson<T>(jar: SalikJar, path: string, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await req(jar, "https://customers.salik.ae" + path);
      if (!res.ok) throw new Error(`salik ${path} -> HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trim()) throw new Error(`salik ${path} -> empty response`);
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw lastError;
}

interface SalikVehicle {
  PlateNumber: string | number;
  PlateColor: string;
  PlateColorId: string;
}

export async function getVehicles(jar: SalikJar): Promise<Map<string, { color: string; colorId: string }>> {
  const data = await getJson<{ Result?: { Vehicles?: SalikVehicle[] } }>(
    jar,
    "/surface/search/vehicles?pageId=1&pageSize=100&searchType=1&lang=en&tagIndicator=false",
  );
  const out = new Map<string, { color: string; colorId: string }>();
  for (const vehicle of data.Result?.Vehicles ?? []) {
    out.set(String(vehicle.PlateNumber).trim(), { color: vehicle.PlateColor, colorId: vehicle.PlateColorId });
  }
  return out;
}

export function parseTripDate(value: string): Date | null {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[4]) % 12;
  if (/pm/i.test(match[7])) hour += 12;
  return new Date(Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]), hour - 4, Number(match[5]), Number(match[6])));
}

const ddmmyyyy = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

interface RawTollTrip {
  TripDateTime: string;
  Amount: string;
  TollGateLocation: string;
  TollGateDirection: string;
}

export async function getTollTrips(jar: SalikJar, query: { plateNumber: string; colorId: string; from: Date; to: Date }) {
  const base =
    `/surface/portal/trips?tripType=1&tagPlateDetails=3&plateNumber=${encodeURIComponent(query.plateNumber)}` +
    `&plateCode=${query.colorId}&plateSource=1&plateCategory=1&timePeriod=4` +
    `&startDate=${ddmmyyyy(query.from)}&endDate=${ddmmyyyy(query.to)}&lang=en`;
  const first = await getJson<{ Result?: { TotalCount?: number; Trips?: RawTollTrip[] } }>(jar, `${base}&pageId=1&pageSize=10`);
  const result = first.Result ?? {};
  const total = result.TotalCount ?? 0;
  const trips = [...(result.Trips ?? [])];
  for (let page = 2; trips.length < total; page++) {
    const data = await getJson<{ Result?: { Trips?: RawTollTrip[] } }>(jar, `${base}&pageId=${page}&pageSize=10`);
    trips.push(...(data.Result?.Trips ?? []));
  }
  return trips.map((trip) => ({
    date: parseTripDate(trip.TripDateTime),
    amount: parseFloat(trip.Amount) || 0,
    gate: `${trip.TollGateLocation} (${trip.TollGateDirection})`,
  }));
}

interface RawParkingTrip {
  PlateNumber: string | number;
  PlateColor: string;
  PartnerTransactionDateTime: string;
  CollectedAmount: string | number;
  Location: string;
}

export async function getParkingTrips(jar: SalikJar, query: { from: Date; to: Date }) {
  const chunkMs = 30 * 86_400_000;
  const out: RawParkingTrip[] = [];
  for (let start = new Date(query.from); start <= query.to; start = new Date(start.getTime() + chunkMs)) {
    const end = new Date(Math.min(start.getTime() + chunkMs - 86_400_000, query.to.getTime()));
    try {
      const base =
        `/surface/portal/parkingtrips?timePeriod=4&tagPlateDetails=1` +
        `&startDate=${ddmmyyyy(start)}&endDate=${ddmmyyyy(end)}&lang=en`;
      const first = await getJson<{ Result?: { TotalCount?: number; ParkingTrips?: RawParkingTrip[] } }>(jar, `${base}&pageId=1&pageSize=100`);
      const result = first.Result ?? {};
      const total = result.TotalCount ?? 0;
      const trips = [...(result.ParkingTrips ?? [])];
      for (let page = 2; trips.length < total; page++) {
        const data = await getJson<{ Result?: { ParkingTrips?: RawParkingTrip[] } }>(jar, `${base}&pageId=${page}&pageSize=100`);
        trips.push(...(data.Result?.ParkingTrips ?? []));
      }
      out.push(...trips);
    } catch (error) {
      console.error(`salik parking chunk ${ddmmyyyy(start)} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return out.map((trip) => ({
    plateNumber: String(trip.PlateNumber).trim(),
    plateColor: trip.PlateColor,
    date: parseTripDate(trip.PartnerTransactionDateTime),
    amount: Number(trip.CollectedAmount) || 0,
    location: trip.Location,
  }));
}
