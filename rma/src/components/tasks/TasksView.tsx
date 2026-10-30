"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Select,
  Label,
  EmptyState,
  cx,
  type BadgeTone,
} from "@/components/ui";
import { Modal, ModalFooter, ModalError } from "@/components/ui/Modal";
import { CheckCircle2, Circle, Clock, ClipboardList, Plus } from "lucide-react";
import { formatDate, humaniseStatus } from "@/lib/format";
import { createTask, reassignTask, completeTask, updateTaskStatus } from "@/modules/tasks/actions";

import type { task as TaskTable } from "@/platform/db/schema";

type Task = typeof TaskTable.$inferSelect;
type Company = { id: string; name: string; businessLine: string };

const STATUS_ICON: Record<string, React.ReactNode> = {
  open: <Circle className="h-4 w-4 text-info" />,
  in_progress: <Clock className="h-4 w-4 text-warn" />,
  done: <CheckCircle2 className="h-4 w-4 text-success" />,
};
const STATUS_TONE: Record<string, BadgeTone> = {
  open: "info",
  in_progress: "warning",
  done: "success",
};

const ROLES = ["sales", "sales_manager", "general_manager", "security", "programs_department", "finance", "fleet", "primary", "technical", "hr"];

export default function TasksView({
  tasks,
  tenantSlug,
  companies = [],
  canManage = false,
}: {
  tasks: Task[];
  tenantSlug: string;
  tenantId: string;
  companies?: Company[];
  canManage?: boolean;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = filter ? tasks.filter((t) => t.status === filter) : tasks;
  const columns = Array.from(new Set(tasks.map((t) => t.column).filter(Boolean)));

  async function onReassign(taskId: string, role: string) {
    if (!role) return;
    setBusyId(taskId);
    try {
      await reassignTask(tenantSlug, taskId, role);
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleDone(taskId: string, done: boolean) {
    setBusyId(taskId);
    try {
      if (done) {
        await completeTask(tenantSlug, taskId);
      } else {
        await updateTaskStatus(tenantSlug, taskId, "open");
      }
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"} — operational + delegated`}
        icon={<ClipboardList className="h-4.5 w-4.5" />}
        action={
          canManage ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New task
            </Button>
          ) : undefined
        }
      />

      {showCreate && (
        <CreateTaskModal tenantSlug={tenantSlug} companies={companies} onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filter === null ? "bg-brand-600 text-white" : "bg-sunken text-ink-2 hover:bg-brand-50 hover:text-brand-700"
          )}
        >
          All
        </button>
        {["open", "in_progress", "done"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === s ? "bg-brand-600 text-white" : "bg-sunken text-ink-2 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            {humaniseStatus(s)}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(columns.length > 0 ? columns : [null]).map((col) => (
            <Card key={col ?? "all"} className="overflow-hidden">
              <CardHeader title={col ?? "Tasks"} />
              <ul className="divide-y divide-line-soft">
                {filtered
                  .filter((t) => (col ? t.column === col : true))
                  .map((t) => (
                    <li key={t.id} className="px-4 py-3 transition-colors hover:bg-sunken/60">
                      <div className="flex items-center gap-2">
                        {STATUS_ICON[t.status] ?? <Circle className="h-4 w-4 text-ink-3" />}
                        <span className="text-sm font-medium text-ink">{t.title}</span>
                      </div>
                      {t.description && <p className="mt-1 line-clamp-2 text-xs text-ink-2">{t.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{humaniseStatus(t.status)}</Badge>
                        {t.board && <Badge tone="brand">{t.board}</Badge>}
                        {t.dueDate && <span className="text-[10px] text-ink-3">Due {formatDate(t.dueDate)}</span>}
                      </div>
                      {canManage && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={t.status === "done" ? "ghost" : "secondary"}
                            disabled={busyId === t.id}
                            onClick={() => onToggleDone(t.id, t.status !== "done")}
                          >
                            {t.status === "done" ? "Reopen" : "Complete"}
                          </Button>
                          <Select
                            defaultValue=""
                            disabled={busyId === t.id}
                            onChange={(e) => onReassign(t.id, e.target.value)}
                            className="h-7 px-2 pr-7 text-xs"
                          >
                            <option value="">Reassign to…</option>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="No tasks yet"
          description="Create one with “New task”."
        />
      )}
    </div>
  );
}

function CreateTaskModal({ tenantSlug, companies, onClose }: { tenantSlug: string; companies: Company[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await createTask(tenantSlug, formData);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create task");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New task"
      subtitle="Assign work to a role — e.g. delegate to security."
      onClose={onClose}
    >
      <form action={submit}>
        {error && <ModalError>{error}</ModalError>}

        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" name="title" required className="w-full" placeholder="Contact overdue lessee…" />
          </div>

          <div>
            <Label htmlFor="task-company">Branch / company</Label>
            <Select id="task-company" name="companyId" className="w-full">
              <option value="">— none —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.businessLine})</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="task-role">Assign to role</Label>
            <Select id="task-role" name="role" defaultValue="security" className="w-full">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" name="dueDate" type="date" className="w-full" />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create & assign"}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
