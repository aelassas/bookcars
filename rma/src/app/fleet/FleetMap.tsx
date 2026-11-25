"use client";

import { useEffect, useRef, useState } from "react";

type VehiclePosition = {
  vehId: number;
  name: string;
  lat: number;
  lon: number;
  speed: number | null;
  updatedAt: string | null;
  active: boolean;
};

type TrackPoint = { t: string; lat: number; lon: number; speed: number | null };
type TrackData = {
  vehId: string;
  imei: string;
  points: TrackPoint[];
  trips: { ts: string; te: string; lengthKm: number; maxSpeed: number }[];
  kmTotal: number;
};

type SelectedVehicle = { vehId: number; name: string; speed: number | null; active: boolean };

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

/** Load mapbox-gl from the official CDN (avoids a new npm dependency). */
function loadMapbox(): Promise<void> {
  if (window.mapboxgl) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://api.mapbox.com/mapbox-gl-js/v3.8.0/mapbox-gl.js";
    js.onload = () => resolve();
    js.onerror = () => reject(new Error("mapbox-gl failed to load"));
    document.head.appendChild(js);
  });
}

const ROUTE_SOURCE = "pilot-route";
const ROUTE_LAYER = "pilot-route-line";
const ROUTE_CASING = "pilot-route-casing";

function fmtGst(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
}

// GPS sanity box — UAE + Oman (cars genuinely cross the border). Fixes
// outside it (or 0/NaN) are tracker garbage: they pollute the live markers
// and, worse, drag a 24h route's fitBounds across the whole map.
const SANE = { minLat: 16, maxLat: 32, minLon: 46, maxLon: 62 };

function saneFix(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= SANE.minLat &&
    lat <= SANE.maxLat &&
    lon >= SANE.minLon &&
    lon <= SANE.maxLon &&
    !(lat === 0 && lon === 0)
  );
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Drop teleport spikes: a fix >200 km from the previous kept fix is dropped —
// UNLESS the next fix confirms the jump (a real long move between sparse
// fixes), in which case the track has genuinely moved and we keep both.
const TELEPORT_KM = 200;

function cleanTrack(points: TrackPoint[]): TrackPoint[] {
  const sane = points.filter((p) => saneFix(p.lat, p.lon));
  const out: TrackPoint[] = [];
  for (let i = 0; i < sane.length; i++) {
    const p = sane[i];
    const prev = out[out.length - 1];
    if (prev && haversineKm(prev, p) > TELEPORT_KM) {
      const next = sane[i + 1];
      if (!next || haversineKm(p, next) > TELEPORT_KM) continue; // unconfirmed spike
    }
    out.push(p);
  }
  return out;
}

export default function FleetMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<Map<string, { marker: any; veh: VehiclePosition }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [lastPoll, setLastPoll] = useState<string>("");
  const [selected, setSelected] = useState<SelectedVehicle | null>(null);
  const [track, setTrack] = useState<TrackData | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [query, setQuery] = useState("");

  function clearRoute() {
    const m = map.current;
    if (m) {
      if (m.getLayer(ROUTE_LAYER)) m.removeLayer(ROUTE_LAYER);
      if (m.getLayer(ROUTE_CASING)) m.removeLayer(ROUTE_CASING);
      if (m.getSource(ROUTE_SOURCE)) m.removeSource(ROUTE_SOURCE);
    }
    setSelected(null);
    setTrack(null);
    setTrackError(null);
    setTrackLoading(false);
  }

  function drawRoute(points: TrackPoint[]) {
    const m = map.current;
    if (!m || points.length === 0) return;
    clearRouteLayersOnly();
    const coords = points.map((p) => [p.lon, p.lat]);
    m.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
    });
    m.addLayer({
      id: ROUTE_CASING, type: "line", source: ROUTE_SOURCE,
      paint: { "line-color": "#0b1526", "line-width": 7, "line-opacity": 0.8 },
    });
    m.addLayer({
      id: ROUTE_LAYER, type: "line", source: ROUTE_SOURCE,
      paint: { "line-color": "#f59e0b", "line-width": 3.5 },
    });
    const mb = window.mapboxgl;
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mb.LngLatBounds(coords[0], coords[0]),
    );
    m.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
  }

  function clearRouteLayersOnly() {
    const m = map.current;
    if (!m) return;
    if (m.getLayer(ROUTE_LAYER)) m.removeLayer(ROUTE_LAYER);
    if (m.getLayer(ROUTE_CASING)) m.removeLayer(ROUTE_CASING);
    if (m.getSource(ROUTE_SOURCE)) m.removeSource(ROUTE_SOURCE);
  }

  async function selectVehicle(v: VehiclePosition) {
    setSelected({ vehId: v.vehId, name: v.name, speed: v.speed, active: v.active });
    map.current?.flyTo({ center: [v.lon, v.lat], zoom: 13, duration: 900 });
    setTrack(null);
    setTrackError(null);
    setTrackLoading(true);
    try {
      const res = await fetch(`/fleet/api/track?veh_id=${v.vehId}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `track ${res.status}`);
      const data = body as TrackData;
      // Filter garbage fixes + teleport spikes BEFORE drawing/bounds, or one
      // bad fix shoots the route across the map and fitBounds zooms to it.
      data.points = cleanTrack(data.points);
      setTrack(data);
      drawRoute(data.points);
    } catch (e) {
      setTrackError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrackLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      const res = await fetch("/fleet/api/positions", { cache: "no-store" });
      if (!res.ok) throw new Error(`positions ${res.status}`);
      return (await res.json()) as { token: string; vehicles: VehiclePosition[] };
    }

    function upsertMarkers(data: VehiclePosition[]) {
      const mb = window.mapboxgl;
      const seen = new Set<string>();
      for (const v of data) {
        seen.add(v.name);
        // Garbage fix (out of the UAE+Oman box / 0 / NaN): keep any existing
        // marker at its last good position, never move it to the bad fix.
        if (!saneFix(v.lat, v.lon)) continue;
        const existing = markers.current.get(v.name);
        const label =
          `${v.name}${v.speed ? ` · ${v.speed} km/h` : ""}` +
          (v.updatedAt ? `\n${new Date(v.updatedAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}` : "");
        if (existing) {
          existing.marker.setLngLat([v.lon, v.lat]);
          existing.veh = v;
          const el = existing.marker.getElement();
          el.style.background = v.active ? "#1a7a4a" : "#9aa7b5";
        } else {
          const el = document.createElement("div");
          el.style.cssText = `width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);background:${v.active ? "#1a7a4a" : "#9aa7b5"};cursor:pointer`;
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            selectVehicle(markers.current.get(v.name)?.veh ?? v);
          });
          const popup = new mb.Popup({ offset: 14, closeButton: false }).setText(label);
          const marker = new mb.Marker({ element: el }).setLngLat([v.lon, v.lat]).setPopup(popup).addTo(map.current);
          markers.current.set(v.name, { marker, veh: v });
        }
      }
      // drop markers for vehicles no longer reported
      for (const [name, m] of markers.current) {
        if (!seen.has(name)) { m.marker.remove(); markers.current.delete(name); }
      }
      setVehicles(data.filter((v) => saneFix(v.lat, v.lon)));
      setCount(data.length);
      setLastPoll(new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai" }));
    }

    (async () => {
      try {
        await loadMapbox();
        const first = await poll();
        if (cancelled || !container.current) return;
        window.mapboxgl.accessToken = first.token;
        map.current = new window.mapboxgl.Map({
          container: container.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [55.27, 25.20], // Dubai
          zoom: 9.5,
        });
        map.current.addControl(new window.mapboxgl.NavigationControl(), "top-right");
        map.current.on("click", () => clearRoute()); // click elsewhere clears the route
        upsertMarkers(first.vehicles);
        timer = setInterval(async () => {
          try { upsertMarkers((await poll()).vehicles); } catch { /* keep last good frame */ }
        }, 60_000);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPoint = track?.points.length ? track.points[track.points.length - 1] : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-line">
      <div ref={container} className="h-full w-full" />
      {/*
        Colours here are PINNED, not themed. These panels sit on a Mapbox dark
        canvas and are deliberately white in both themes — but `text-ink` flips
        to #f0f2f7 under `:root.dark`, which painted white text on the white
        panel and made the whole overlay vanish (owner, 2026-08-31: "there is
        white on white"). A panel whose background does not follow the theme
        must not take its text colour from the theme either.
      */}
      <div className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-3 py-1.5 text-xs text-slate-900 shadow">
        {error
          ? <span className="text-red-600">map error: {error}</span>
          : count == null
            ? "loading fleet…"
            : <>{count} vehicles · green = reporting · polled {lastPoll}</>}
      </div>
      {/* Car list — "Pilot lite": search by plate, tap a car to fly to it
          and open its 24h route. Same pinned white-on-dark rule as the pill
          above: these panels never take theme colours. */}
      <div className="absolute bottom-3 left-3 top-12 z-10 flex w-64 flex-col rounded-md bg-white/95 text-xs text-slate-900 shadow-lg">
        <div className="border-b border-slate-200 p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plate / name…"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {vehicles
            .filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()))
            .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
            .map((v) => {
              const isSel = selected?.vehId === v.vehId;
              return (
                <button
                  key={v.vehId}
                  onClick={() => selectVehicle(v)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 ${isSel ? "bg-slate-200" : ""}`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: v.active ? "#1a7a4a" : "#9aa7b5" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.name}</span>
                    <span className="block text-slate-500">
                      {v.active
                        ? v.speed && v.speed > 3
                          ? `Moving · ${v.speed} km/h`
                          : "Parked"
                        : "Not reporting"}
                      {v.updatedAt ? ` · ${fmtGst(v.updatedAt)}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          {vehicles.length > 0 &&
            vehicles.filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase())).length === 0 && (
              <div className="px-3 py-4 text-center text-slate-500">no car matches “{query}”</div>
            )}
        </div>
      </div>
      {selected && (
        <div className="absolute right-3 top-3 z-10 w-72 rounded-md bg-white/95 p-3 text-xs text-slate-900 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm">{selected.name}</div>
            <button
              onClick={clearRoute}
              className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
              aria-label="Close route"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-slate-600">
            {selected.active
              ? selected.speed && selected.speed > 3
                ? `Moving · ${selected.speed} km/h`
                : "Parked"
              : "Not reporting"}
          </div>
          {trackLoading && <div className="mt-2 text-slate-600">loading route (last 24h)…</div>}
          {trackError && <div className="mt-2 text-red-600">route error: {trackError}</div>}
          {track && (
            <div className="mt-2 space-y-1">
              {track.points.length === 0 ? (
                <div className="text-slate-600">no GPS points in the last 24h</div>
              ) : (
                <>
                  <div>{track.kmTotal} km · {track.trips.length} trips · last 24h</div>
                  <div className="text-slate-600">{fmtGst(track.points[0].t)} → {fmtGst(lastPoint!.t)} GST</div>
                  {lastPoint?.speed != null && (
                    <div className="text-slate-600">last fix speed {lastPoint.speed} km/h</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
