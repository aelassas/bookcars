"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getCustomersPaginated } from "@/modules/crm/customer-queries";

type Option = { id: string; label: string };

export function CustomerSearch({
  tenantId,
  value,
  onChange,
  placeholder = "Search customers…",
  initialValue = "",
}: {
  tenantId: string;
  value: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  /** Pre-filled search text (e.g. the lead's customer name). */
  initialValue?: string;
}) {
  const [input, setInput] = useState(initialValue);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const result = await getCustomersPaginated(tenantId, { page: 1, pageSize: 20, search: input || undefined });
        setOptions(
          result.rows.map((r) => ({
            id: r.id,
            label: r.name ?? r.id,
          }))
        );
      });
    }, 300);
    return () => clearTimeout(t);
  }, [input, open, tenantId]);

  function handleSelect(opt: Option) {
    setSelectedLabel(opt.label);
    setInput(opt.label);
    setOpen(false);
    onChange(opt.id, opt.label);
  }

  function handleClear() {
    setSelectedLabel("");
    setInput("");
    setOptions([]);
    onChange("", "");
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          className="w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
          placeholder={value && selectedLabel ? selectedLabel : placeholder}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-field border border-line bg-surface px-2 text-xs text-ink-3 hover:text-ink"
          >
            x
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-field border border-line bg-surface shadow-lifted">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-sunken"
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="customerId" value={value} />
    </div>
  );
}
