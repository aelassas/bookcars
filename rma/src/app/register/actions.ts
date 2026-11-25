"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/platform/db/client";
import { user, tenant, tenantMember } from "@/platform/db/schema";
import { clientIp, isOfficeLan, macFor, recordDevice } from "@/platform/net/device";

const BRANDS = ["rma"];

export type RegisterState = { error?: string };

export async function registerFromLan(
  _prev: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const h = await headers();
  const ip = clientIp(h);
  if (!isOfficeLan(ip)) {
    return { error: "Registration is only available from the office network." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const brand = String(formData.get("brand") ?? "rma").trim();

  if (!name) return { error: "Enter your full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (!BRANDS.includes(brand)) return { error: "Choose your company." };

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) return { error: "That email is already registered — just sign in." };

  const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, brand)).limit(1);
  if (!t) return { error: "Company not found." };

  const hash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(user)
    .values({ name, email, password: hash })
    .returning({ id: user.id });

  // Least-privilege: self-registered staff land as "sales" in their brand.
  // An admin promotes or removes them during the device-confirmation review.
  await db.insert(tenantMember).values({ tenantId: t.id, userId: created.id, roles: ["sales"] });

  await recordDevice(created.id, email, ip, macFor(ip), h.get("user-agent") ?? "");

  redirect("/login?registered=1");
}
