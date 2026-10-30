import "server-only";
import { execFileSync } from "node:child_process";
import { and, eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { deviceLogin } from "@/platform/db/schema";

// The office LAN the 15 staff sit on. MAC visibility requires L2 adjacency,
// so self-registration is only allowed from here (+ the box itself).
const OFFICE_LAN = ["10.255.254.", "127.0.0.1", "::1", "::ffff:127."];

export function clientIp(h: Headers): string {
  const xr = h.get("x-real-ip") || h.get("x-forwarded-for") || "";
  return xr.split(",")[0].trim();
}

export function isOfficeLan(ip: string): boolean {
  return OFFICE_LAN.some((p) => ip.startsWith(p));
}

// Resolve a LAN IP to its device MAC via the box's ARP table. Returns null
// off-LAN or when the entry is incomplete. ip is validated to avoid any shell
// surface (execFile, no shell).
export function macFor(ip: string): string | null {
  if (!/^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(ip)) return null;
  try {
    const out = execFileSync("arp", ["-n", ip], { timeout: 3000 }).toString();
    const m = out.match(/([0-9a-f]{1,2}:){5}[0-9a-f]{1,2}/i);
    return m ? m[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

// Soft capture: one row per (user, device). Updates last-seen on repeat.
export async function recordDevice(
  userId: string,
  email: string,
  ip: string,
  mac: string | null,
  ua: string,
) {
  const match = mac
    ? and(eq(deviceLogin.userId, userId), eq(deviceLogin.mac, mac))
    : and(eq(deviceLogin.userId, userId), eq(deviceLogin.ip, ip));
  const [existing] = await db
    .select({ id: deviceLogin.id })
    .from(deviceLogin)
    .where(match)
    .limit(1);
  if (existing) {
    await db
      .update(deviceLogin)
      .set({ lastSeen: new Date(), ip, userAgent: ua })
      .where(eq(deviceLogin.id, existing.id));
  } else {
    await db.insert(deviceLogin).values({ userId, email, ip, mac, userAgent: ua });
  }
}
