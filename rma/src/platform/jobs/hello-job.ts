import { boss } from "./boss";
import { createTenantJob } from "./withTenant";
import { HELLO_QUEUE } from "./queues";
import { lead } from "@/platform/db/schema";
import { count } from "drizzle-orm";

// The canonical name lives in ./queues — a literal here would drift silently on
// a rename and leave this worker polling a queue that does not exist.
export const helloQueue = HELLO_QUEUE;

export function startHelloWorker() {
  return createTenantJob<{ tenantId: string; message: string }>(
    helloQueue,
    async ({ data, tx }) => {
      // Trivial work: count leads for this tenant via RLS. Must use `tx` (the
      // connection carrying this job's tenant context) or RLS won't apply.
      const [result] = await tx.select({ count: count() }).from(lead);
      console.log(
        `[${helloQueue}] ${data.message} | tenant=${data.tenantId} | leads=${result.count}`
      );
    }
  );
}

export async function sendHelloJob(tenantId: string, message: string) {
  return boss.send({ name: helloQueue, data: { tenantId, message } });
}
