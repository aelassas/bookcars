import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/platform/db/client";
import { tenant } from "../src/platform/db/schema";
import { boss } from "../src/platform/jobs/boss";
import { startHelloWorker, sendHelloJob } from "../src/platform/jobs/hello-job";

async function main() {
  await boss.start();
  console.log("pg-boss started ✅");

  await boss.createQueue("hello-tenant-job");
  console.log("Queue created ✅");

  startHelloWorker();
  console.log("Worker started ✅");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const [t] = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1);
  if (!t) throw new Error("take-auto tenant not found — run seed-crm first");

  const jobId = await sendHelloJob(t.id, "Week 1 trivial job test");
  console.log("Job sent:", jobId);

  // Wait long enough for job to be fetched, processed, and logged
  await new Promise((resolve) => setTimeout(resolve, 8000));

  await boss.stop();
  console.log("pg-boss stopped ✅");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
