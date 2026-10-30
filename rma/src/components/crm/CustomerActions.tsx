"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { CreateCustomerModal, type EditableCustomer } from "@/components/modals/CreateCustomerModal";

export function CustomerActions({ tenantId, customer }: { tenantId: string; customer: EditableCustomer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {saved && <span role="status" className="text-sm text-success">Customer updated</span>}
      <Button variant="secondary" onClick={() => { setSaved(false); setOpen(true); }}>
        <Pencil className="h-4 w-4" /> Edit customer
      </Button>
      {open && <CreateCustomerModal tenantId={tenantId} customer={customer} onClose={() => setOpen(false)} onCreated={() => { setSaved(true); router.refresh(); }} />}
    </div>
  );
}
