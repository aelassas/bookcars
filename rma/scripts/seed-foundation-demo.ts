/**
 * Foundation demo seed (interview scaffold).
 * Creates: holding companies (TAKE Auto=leasing, Cardiwan + ETM=rental), scoped
 * demo users, and payment scenarios per branch (clean / late-then-paid /
 * unpaid). All rows are clearly DEMO. Idempotent: wipes prior foundation demo
 * rows for the three companies, then re-inserts.
 *
 * Run after setup-takeauto-tenant.ts. Demo passwords are NOT for production.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/platform/db/client";
import {
  tenant, company, user, tenantMember,
  customer, vehicle, rental, lease, leaseInstallment, task, payment,
} from "@/platform/db/schema";

const TENANT_SLUG = "take-auto";
const DEMO_PW = "Demo1234!";
const day = 86_400_000;
const now = Date.now();
const d = (offsetDays: number) => new Date(now + offsetDays * day);

// drizzle .returning() has a union type; these narrow it for a seed script.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const first = (r: any): any => (Array.isArray(r) ? r[0] : r);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstId = (r: any): string => first(r).id;

async function main() {
  const [t] = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1);
  if (!t) throw new Error("Tenant 'take-auto' not found — run setup-takeauto-tenant.ts first.");
  const tid = t.id;
  console.log("Foundation demo seed → tenant", tid);

  // ── Companies (brands) ──────────────────────────────────────────────────
  async function upsertCompany(slug: string, name: string, line: "rental" | "leasing", accent: string) {
    const [ex] = await db.select().from(company).where(and(eq(company.tenantId, tid), eq(company.slug, slug))).limit(1);
    if (ex) {
      await db.update(company).set({ name, businessLine: line, brandName: name, accentColor: accent, updatedAt: new Date() }).where(eq(company.id, ex.id));
      return ex.id;
    }
    return firstId(await db.insert(company).values({ tenantId: tid, slug, name, businessLine: line, brandName: name, accentColor: accent }).returning());
  }
  // THREE brands (spec): TAKE Auto = leasing; Cardiwan + ETM = rental.
  // Brand accents approximated from the real sites (takeauto.ae = dark navy;
  // cardiwan.ae = gold; etmluxurycarrental.com = luxury black/charcoal,
  // "no deposit" positioning). ETM palette is approximate — TODO: confirm exact
  // logo/colours from etmrental.com / etmluxurycarrental.com.
  const leasingCo = await upsertCompany("take-auto", "TAKE Auto", "leasing", "#1B2A4A");
  const rentalCo = await upsertCompany("cardiwan", "Cardiwan", "rental", "#C9A227");
  const etmCo = await upsertCompany("etm", "ETM", "rental", "#1A1A1A");
  try {
    const res = await fetch("https://cardiwan.ae/cdn/shop/files/LOGO_CARDIWAN.png?v=1757248734&width=400");
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 1000 && buf.length < 400_000) {
        await db.update(company).set({ logoUrl: `data:image/png;base64,${buf.toString("base64")}` }).where(eq(company.id, rentalCo));
      }
    }
  } catch { /* offline — keep wordmark */ }
  console.log("  ✓ companies: TAKE Auto (leasing, navy), Cardiwan (rental, gold + logo), ETM (rental, luxury black)");

  // ── Demo users (scoped) ─────────────────────────────────────────────────
  const pw = await bcrypt.hash(DEMO_PW, 10);
  async function upsertUser(email: string, name: string, companyIds: string[] | null, cross: boolean, roles: string[]) {
    let [u] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (!u) { u = first(await db.insert(user).values({ email, name, password: pw }).returning()); }
    else { await db.update(user).set({ name, password: pw }).where(eq(user.id, u.id)); }
    const [m] = await db.select().from(tenantMember).where(and(eq(tenantMember.tenantId, tid), eq(tenantMember.userId, u.id))).limit(1);
    const vals = { companyIds: companyIds ?? undefined, crossBranch: cross, roles };
    if (m) await db.update(tenantMember).set({ ...vals, updatedAt: new Date() }).where(eq(tenantMember.id, m.id));
    else await db.insert(tenantMember).values({ tenantId: tid, userId: u.id, ...vals });
    return u.id;
  }
  const OPS = ["sales", "fleet", "finance", "primary"];
  const leaseUser = await upsertUser("lease.demo@takeauto.ae", "Lease Demo · TAKE Auto", [leasingCo], false, OPS);
  const rentUser = await upsertUser("rent.demo@cardiwan.ae", "Rent Demo · Cardiwan", [rentalCo], false, OPS);
  const etmUser = await upsertUser("rent.demo@etmrental.com", "Rent Demo · ETM", [etmCo], false, OPS);
  // security: RENTAL-ONLY but cross-brand within rental (sees all rental
  // companies via /security). Primary company = Cardiwan so nav/branding stays
  // rental (never leasing). crossBranch=true grants the rental cross-brand read.
  await upsertUser("security.demo@cardiwan.ae", "Security Demo · rental (cross-brand)", [rentalCo], true, ["security"]);
  // admin: cross-branch holding admin (see all data + all nav), branded holding.
  await upsertUser("admin.demo@takeauto.ae", "Admin Demo · Holding", [leasingCo], true, ["tenant_admin"]);
  console.log("  ✓ users: admin.demo@takeauto.ae, lease.demo@takeauto.ae, rent.demo@cardiwan.ae, rent.demo@etmrental.com, security.demo@cardiwan.ae  (pw:", DEMO_PW + ")");

  // ── Wipe prior foundation demo rows for these companies (idempotent) ─────
  const cos = [leasingCo, rentalCo, etmCo];
  await db.delete(task).where(inArray(task.companyId, cos));
  const leaseIds = (await db.select({ id: lease.id }).from(lease).where(inArray(lease.companyId, cos))).map(r => r.id);
  if (leaseIds.length) await db.delete(leaseInstallment).where(inArray(leaseInstallment.leaseId, leaseIds));
  await db.delete(lease).where(inArray(lease.companyId, cos));
  await db.delete(rental).where(inArray(rental.companyId, cos));
  await db.delete(customer).where(inArray(customer.companyId, cos));
  await db.delete(vehicle).where(inArray(vehicle.companyId, cos));

  // ── helpers ─────────────────────────────────────────────────────────────
  async function mkCustomer(co: string, name: string, division: "rent" | "lease") {
    return firstId(await db.insert(customer).values({ tenantId: tid, companyId: co, name: `[DEMO] ${name}`, phone: "+9715000000" + Math.floor(Math.random() * 90 + 10), division, source: "walk_in" }).returning());
  }
  async function mkVehicle(co: string, make: string, model: string, plate: string) {
    return firstId(await db.insert(vehicle).values({ tenantId: tid, companyId: co, make, model, plate: `[DEMO] ${plate}`, status: "available" }).returning());
  }
  async function mkTask(co: string, title: string, role: string, due: Date) {
    await db.insert(task).values({ tenantId: tid, companyId: co, title: `[DEMO] ${title}`, board: role, column: "open", status: "open", dueDate: due });
  }

  // ── RENTAL scenarios (Cardiwan) — exotic fleet, contracts R-2001… ─────────
  async function mkRental(name: string, make: string, model: string, plate: string, ref: string,
    startOff: number, endOff: number, dailyRate: number, deposit: number, total: number, balanceDue: number, note: string) {
    const c = await mkCustomer(rentalCo, name, "rent");
    const v = await mkVehicle(rentalCo, make, model, plate);
    const days = Math.max(1, endOff - startOff);
    return firstId(await db.insert(rental).values({ tenantId: tid, companyId: rentalCo, customerId: c, vehicleId: v, startDate: d(startOff), returnDate: d(endOff), dailyRate, totalDays: days, deposit, total, balanceDue, status: "active", notes: `[DEMO] ${ref} · ${note}` }).returning());
  }
  // 1 clean
  await mkRental("Omar Haddad (clean)", "Lamborghini", "Huracán", "R 20011", "R-2001", -5, 10, 4500, 5000, 67500, 0, "Clean — paid in full, confirmed by finance.");
  // 2 late→paid
  await mkRental("Sara Nasser (late→paid)", "BMW", "5 Series", "R 20031", "R-2003", -20, 5, 900, 1500, 22500, 0, "Was overdue → received & confirmed by finance → overdue cleared.");
  // 3 unpaid → collections + security escalation
  await mkRental("Khalid Aziz (unpaid)", "Rolls-Royce", "Ghost", "R 20041", "R-2004", -40, -8, 3500, 5000, 112000, 42000, "UNPAID — 8 days overdue. Collections + security; flagged 'for repossession'.");
  await mkTask(rentalCo, "R-2004: confirm/chase overdue balance (Cardiwan)", "sales", d(0));
  await mkTask(rentalCo, "R-2004: contact overdue renter — repossession review; engine block via Security w/ confirmation + journal (Cardiwan)", "security", d(1));
  // 4 accepted-by-manager, NOT confirmed by finance (R-2002) → pending payment + 2 tasks
  {
    const c = await mkCustomer(rentalCo, "Noura Salem (accepted-not-posted)", "rent");
    const v = await mkVehicle(rentalCo, "Mercedes-Benz", "C-Class", "R 20021");
    const rid = firstId(await db.insert(rental).values({ tenantId: tid, companyId: rentalCo, customerId: c, vehicleId: v, startDate: d(-3), returnDate: d(12), dailyRate: 700, totalDays: 15, deposit: 1500, total: 10500, balanceDue: 10500, status: "active", notes: "[DEMO] R-2002 · Manager accepted 5000 AED cash — awaiting finance confirmation." }).returning());
    const pid = firstId(await db.insert(payment).values({ tenantId: tid, rentalId: rid, amount: 5000, method: "cash", status: "pending", notes: "[DEMO] accepted by manager" }).returning());
    const ref = `payment:${pid}`;
    await db.insert(task).values([
      { tenantId: tid, companyId: rentalCo, externalId: ref, board: "finance", column: "open", status: "open", title: "[DEMO] R-2002: confirm & post 5000 AED cash payment (Cardiwan)", dueDate: d(0) },
      { tenantId: tid, companyId: rentalCo, externalId: ref, board: "security", column: "open", status: "open", title: "[DEMO] R-2002: cash accepted, not posted — verify till hand-in (Cardiwan)", dueDate: d(0) },
    ]);
  }
  // named SB task: client unreachable → GPS check
  await mkTask(rentalCo, "Cardiwan: renter unreachable 2 days — check GPS location & status (VIN WDB-DEMO-2218)", "security", d(0));

  // ── ETM (rental, luxury "no deposit") — one clean contract to prove the 3rd
  // brand + rental-line isolation. Security (rental cross-brand) sees this too.
  {
    const c = await mkCustomer(etmCo, "Hassan Mubarak (clean)", "rent");
    const v = await mkVehicle(etmCo, "Bentley", "Continental GT", "E 30011");
    await db.insert(rental).values({ tenantId: tid, companyId: etmCo, customerId: c, vehicleId: v, startDate: d(-3), returnDate: d(11), dailyRate: 3800, totalDays: 14, deposit: 0, total: 53200, balanceDue: 0, status: "active", notes: "[DEMO] E-3001 · ETM luxury, no-deposit — paid in full." }).returning();
  }
  await mkTask(etmCo, "ETM: verify renter documents before handover (no-deposit policy)", "security", d(0));
  console.log("  ✓ rental scenarios: Cardiwan R-2001…R-2004, ETM E-3001");

  // ── LEASE scenarios (TAKE Auto) — premium fleet, contracts L-1001… ────────
  async function mkLease(name: string, make: string, model: string, plate: string, ref: string, status: string, balanceDue: number, monthly: number, schedule: { offsetDays: number; status: "paid" | "overdue" | "pending" }[]) {
    const c = await mkCustomer(leasingCo, name, "lease");
    const v = await mkVehicle(leasingCo, make, model, plate);
    const l = firstId(await db.insert(lease).values({ tenantId: tid, companyId: leasingCo, customerId: c, vehicleId: v, contractRef: ref, startDate: d(-90), endDate: d(640), termMonths: 24, downPayment: Math.round(monthly * 5), monthlyPayment: monthly, residualValue: 1000, totalAmount: 24 * monthly + Math.round(monthly * 5), balanceDue, status, notes: `[DEMO] ${ref} · lease-to-own, buyout 1000 AED` }).returning());
    let n = 1;
    for (const s of schedule) {
      await db.insert(leaseInstallment).values({ tenantId: tid, leaseId: l, installmentNumber: n++, dueDate: d(s.offsetDays), amount: monthly, status: s.status, paidAt: s.status === "paid" ? d(s.offsetDays) : null });
    }
    return l;
  }
  const sched = (mid: "paid" | "overdue"): { offsetDays: number; status: "paid" | "overdue" | "pending" }[] =>
    [{ offsetDays: -60, status: "paid" }, { offsetDays: -30, status: mid }, { offsetDays: 0, status: mid === "overdue" ? "overdue" : "paid" }, { offsetDays: 30, status: "pending" }];
  // 1 clean
  await mkLease("Ahmed Al Farsi (clean)", "Range Rover", "Vogue", "L 10011", "L-1001", "active", 0, 6500, sched("paid"));
  // 2 late→paid
  await mkLease("Layla Haddad (late→paid)", "BMW", "X7", "L 10021", "L-1002", "active", 0, 5500,
    [{ offsetDays: -60, status: "paid" }, { offsetDays: -30, status: "paid" }, { offsetDays: -2, status: "paid" }, { offsetDays: 30, status: "pending" }]);
  // 3 defaulted (L-1003) → named SB tasks
  await mkLease("Yusuf Karimov (defaulted)", "Mercedes-Benz", "G-Class G63", "L 10031", "L-1003", "defaulted", 13000, 6500, sched("overdue"));
  // Leasing has NO security role (Security is rental-only) — leasing overdue /
  // field work is owned by the sales line.
  await mkTask(leasingCo, "L-1003: 12 days overdue, client unresponsive — field visit, contact, log vehicle status", "sales_manager", d(0));
  await mkTask(leasingCo, "L-1003: confirm/chase overdue lease installment (TAKE Auto)", "sales", d(0));
  // 4 scheduled return/inspection tomorrow
  await mkLease("Maryam Saleh (active)", "BMW", "X7", "L 10071", "L-1007", "active", 0, 5500, sched("paid"));
  await mkTask(leasingCo, "L-1007: scheduled return/inspection tomorrow — verify vehicle condition + take photos", "sales", d(1));
  console.log("  ✓ lease scenarios (TAKE Auto): premium fleet, L-1001…L-1007");

  // Neutral holding name so a brand (e.g. TAKE Auto) doesn't leak into page
  // subtitles for users of another brand. Per-company brand drives the sidebar.
  // Also mark onboarded so demo users land straight in their workspace.
  await db.update(tenant).set({ onboardedAt: new Date(), name: "Holding Group" }).where(eq(tenant.id, tid));

  console.log("\n── Foundation demo ready ──");
  console.log("  lease.demo@takeauto.ae    (TAKE Auto / leasing)");
  console.log("  rent.demo@cardiwan.ae     (Cardiwan / rental)");
  console.log("  rent.demo@etmrental.com   (ETM / rental)");
  console.log("  security.demo@cardiwan.ae (rental cross-brand security)");
  console.log("  password:", DEMO_PW);
  void leaseUser; void rentUser; void etmUser;
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
