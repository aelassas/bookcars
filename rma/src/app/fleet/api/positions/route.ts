import { NextResponse } from "next/server";
import { auth } from "@/platform/auth";

export const dynamic = "force-dynamic";

const PILOT_BASE = process.env.PILOT_API_BASE ?? "https://pilot-gps.com/api/api.php";

type PilotVehicle = { veh_id: number; vehiclenumber?: string };
type PilotStatus = {
  agentid: number;
  status?: { active: number; lat?: string; lon?: string; speed?: number; unixtimestamp?: string };
};

async function pilot(cmd: string): Promise<Record<string, unknown>> {
  const user = process.env.PILOT_API_EMAIL?.trim();
  const pass = process.env.PILOT_API_PASSWORD?.trim();
  if (!user || !pass) throw new Error("PILOT_API_* not configured");
  const res = await fetch(`${PILOT_BASE}?${cmd}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  const body = (await res.json()) as { code: number; msg: string };
  if (body.code !== 0) throw new Error(`pilot: ${body.msg}`);
  return body as Record<string, unknown>;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const list = (await pilot("cmd=list")) as { list?: PilotVehicle[] };
    const vehicles = list.list ?? [];
    const nameById = new Map(vehicles.map((v) => [v.veh_id, (v.vehiclenumber ?? "").trim() || `#${v.veh_id}`]));

    const statuses: PilotStatus[] = [];
    const ids = vehicles.map((v) => v.veh_id);
    for (let i = 0; i < ids.length; i += 40) {
      const r = (await pilot(`cmd=status&agents=${ids.slice(i, i + 40).join(",")}`)) as { data?: PilotStatus[] };
      if (r.data) statuses.push(...r.data);
    }

    const out = statuses
      .filter((s) => s.status?.lat && s.status?.lon)
      .map((s) => ({
        vehId: s.agentid,
        name: nameById.get(s.agentid) ?? `#${s.agentid}`,
        lat: Number(s.status!.lat),
        lon: Number(s.status!.lon),
        speed: s.status!.speed ?? null,
        updatedAt: s.status!.unixtimestamp ? new Date(Number(s.status!.unixtimestamp) * 1000).toISOString() : null,
        active: s.status!.active === 1,
      }));

    return NextResponse.json({
      token: process.env.MAPBOX_PUBLIC_TOKEN ?? "",
      vehicles: out,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
