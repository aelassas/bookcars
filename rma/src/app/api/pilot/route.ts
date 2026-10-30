import { NextResponse } from "next/server";
import { getFleetForTenant } from "@/modules/fleet/queries";
import { getActiveTenant } from "@/platform/auth/tenant";

export async function GET() {
  const t = await getActiveTenant();
  if (!t) {
    return NextResponse.json({ error: "Not authenticated or no tenant" }, { status: 401 });
  }
  try {
    const { mode, vehicles } = await getFleetForTenant(t.id);
    return NextResponse.json({ mode, count: vehicles.length, vehicles });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pilot request failed" },
      { status: 502 }
    );
  }
}
