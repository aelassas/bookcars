"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, cx } from "./index";

const CloseContext = createContext<(() => void) | null>(null);
let openDialogs = 0;
let originalOverflow = "";

const WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = "md",
  busy = false,
  protectChanges = false,
  hasChanges = false,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: keyof typeof WIDTH;
  busy?: boolean;
  protectChanges?: boolean;
  /** For controls that change a value without emitting a native change event. */
  hasChanges?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLFieldSetElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Native modal dialogs keep focus inside, make the page inert, and restore
  // focus to the opener. The top layer also escapes transformed parent panels.
  useEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    contentRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    )?.focus();
    if (openDialogs++ === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = originalOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (confirmDiscard) keepEditingRef.current?.focus();
    else if (previousFocus.current?.isConnected) previousFocus.current.focus();
  }, [confirmDiscard]);

  useEffect(() => {
    if (!protectChanges || (!dirty && !hasChanges && !busy)) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [protectChanges, dirty, hasChanges, busy]);

  function requestClose() {
    if (busy) return;
    if (protectChanges && (dirty || hasChanges)) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setConfirmDiscard(true);
    } else onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={confirmDiscard ? "Discard unsaved changes?" : title}
      aria-modal="true"
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)',
        )).filter((control) => control.getClientRects().length > 0 && control.tabIndex >= 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (confirmDiscard) setConfirmDiscard(false);
        else requestClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
      }}
      className={cx("fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] overflow-hidden rounded-card border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-black/45", WIDTH[width])}
    >
      <CloseContext.Provider value={requestClose}>
      <div
        className="flex max-h-[92dvh] flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink">{confirmDiscard ? "Discard unsaved changes?" : title}</h2>
            {!confirmDiscard && subtitle && <div className="mt-0.5 text-sm text-ink-2">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={() => confirmDiscard ? setConfirmDiscard(false) : requestClose()}
            disabled={busy}
            className="shrink-0 rounded-field p-1.5 text-ink-3 transition-colors hover:bg-sunken hover:text-ink-2 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {confirmDiscard && (
          <div className="px-5 py-4">
            <p className="text-sm text-ink-2">Your changes haven’t been saved. You can keep editing or discard them.</p>
            <ModalFooter className="mt-4">
              <button ref={keepEditingRef} type="button" onClick={() => setConfirmDiscard(false)} className="rounded-field border border-line px-3 py-2 text-sm font-medium hover:bg-sunken">Keep editing</button>
              <Button variant="danger" onClick={onClose}>Discard changes</Button>
            </ModalFooter>
          </div>
        )}
        <fieldset ref={contentRef} disabled={busy} hidden={confirmDiscard} onChangeCapture={() => setDirty(true)} className="min-w-0 overflow-y-auto px-5 py-4">
          {children}
        </fieldset>
      </div>
      </CloseContext.Provider>
    </dialog>
  );
}

/** Route Cancel through the same unsaved-change guard as Escape and Close. */
export function ModalCancel({ children = "Cancel" }: { children?: ReactNode }) {
  const close = useContext(CloseContext);
  return <Button type="button" variant="secondary" onClick={() => close?.()}>{children}</Button>;
}

/** Standard action row at the bottom of a modal form (render inside the <form>). */
export function ModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Inline error banner for modal forms. */
export function ModalError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </div>
  );
}
