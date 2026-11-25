import { NextResponse } from "next/server";
import { getActiveTenant } from "@/platform/auth/tenant";
import { getRentalReport, REPORT_PERIODS, type ReportPeriod } from "@/modules/reports/rental";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Tenant-bound, not just signed-in: the report aggregates across brands, so
  // a bare session check would serve it to any member of any tenant.
  const t = await getActiveTenant();
  if (!t?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const period = new URL(req.url).searchParams.get("period") ?? "today";
  if (!REPORT_PERIODS.includes(period as ReportPeriod)) {
    return NextResponse.json({ error: "invalid period" }, { status: 400 });
  }

  try {
    const report = await getRentalReport(period as ReportPeriod);
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
