"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { task, auditEvent } from "@/platform/db/schema";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageTasksForTenant, requireAuth } from "@/platform/auth/authorization";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";

// Create a task and assign it to a role (board). Used by admin to dispatch
// work to any role, including security.
export async function createTask(tenantSlug: string, formData: FormData) {
  const t = await getTenantBySlug(tenantSlug);
  if (!t) throw new Error("Tenant not found");
  await canManageTasksForTenant(t.id);
  const actorId = await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const companyId = String(formData.get("companyId") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "").trim() || null;
  const dueStr = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueStr ? new Date(dueStr) : null;

  await withDrizzleTenant(t.id, async (tx) => {
    const [row] = await tx
      .insert(task)
      .values({ tenantId: t.id, companyId, title, board: role, column: "open", status: "open", dueDate })
      .returning({ id: task.id });
    await tx.insert(auditEvent).values({
      tenantId: t.id, actorId, action: "task_created", entityType: "task", entityId: row.id,
      intent: `Created "${title}" → ${role ?? "unassigned"}`,
    });
  });
  revalidatePath(`/${tenantSlug}/tasks`);
  revalidatePath(`/${tenantSlug}/security`);
}

type TaskStatus = "open" | "in_progress" | "done";

// Explicit status transition — backs the "Complete" / "Reopen" controls in
// TasksView and the security queue. No automated flow set task.status
// before this; it was only ever flipped to "done" by payment automation.
export async function updateTaskStatus(tenantSlug: string, taskId: string, status: TaskStatus) {
  const t = await getTenantBySlug(tenantSlug);
  if (!t) throw new Error("Tenant not found");
  await assertNotPreviewMode(t.id);
  await canManageTasksForTenant(t.id);
  const actorId = await requireAuth();

  await withDrizzleTenant(t.id, async (tx) => {
    await tx.update(task).set({ status, updatedAt: new Date() }).where(eq(task.id, taskId));
    await tx.insert(auditEvent).values({
      tenantId: t.id, actorId, action: "task_status_updated", entityType: "task", entityId: taskId,
      intent: `Status → ${status}`,
    });
  });
  revalidatePath(`/${tenantSlug}/tasks`);
  revalidatePath(`/${tenantSlug}/security`);
}

// Convenience wrapper for the common "mark done" action.
export async function completeTask(tenantSlug: string, taskId: string) {
  return updateTaskStatus(tenantSlug, taskId, "done");
}

// Reassign (transfer) a task to a different role.
export async function reassignTask(tenantSlug: string, taskId: string, role: string) {
  const t = await getTenantBySlug(tenantSlug);
  if (!t) throw new Error("Tenant not found");
  await canManageTasksForTenant(t.id);
  const actorId = await requireAuth();

  await withDrizzleTenant(t.id, async (tx) => {
    await tx.update(task).set({ board: role, updatedAt: new Date() }).where(eq(task.id, taskId));
    await tx.insert(auditEvent).values({
      tenantId: t.id, actorId, action: "task_reassigned", entityType: "task", entityId: taskId,
      intent: `Reassigned to ${role}`,
    });
  });
  revalidatePath(`/${tenantSlug}/tasks`);
  revalidatePath(`/${tenantSlug}/security`);
}
