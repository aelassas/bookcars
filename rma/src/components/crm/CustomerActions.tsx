"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { CreateCustomerModal, type EditableCustomer } from "@/components/modals/CreateCustomerModal";
import { deleteCustomer } from "@/modules/crm/customer-actions";

export function CustomerActions({ tenantId, customer }: { tenantId: string; customer: EditableCustomer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmation = prompt("Type DELETE to permanently delete this unused customer");
    if (confirmation !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteCustomer(tenantId, customer.id, confirmation);
      if (result.error) {
        setError(result.error);
        setDeleting(false);
        return;
      }
      window.location.href = `/${window.location.pathname.split("/")[1]}/customers`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Customer deletion failed");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {saved && <span role="status" className="text-sm text-success">Customer updated</span>}
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
      <Button variant="secondary" disabled={deleting} onClick={() => { setSaved(false); setOpen(true); }}>
        <Pencil className="h-4 w-4" /> Edit customer
      </Button>
      <Button variant="danger" disabled={deleting} onClick={handleDelete}>
        <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
      </Button>
      {open && <CreateCustomerModal tenantId={tenantId} customer={customer} onClose={() => setOpen(false)} onCreated={() => { setSaved(true); router.refresh(); }} />}
    </div>
  );
}
