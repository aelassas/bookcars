"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Card, Button, cx } from "@/components/ui";
import { ArrowLeft, MessageSquare, Paperclip, X } from "lucide-react";
import type { ConversationThread as Thread } from "@/modules/messaging/queries";
import { queueThreadReply } from "@/modules/messaging/thread-actions";
import { MessageBody } from "./MessageBody";
import { formatDateTime } from "@/lib/format";

const TEXTAREA_CLS =
  "w-full resize-none rounded-field border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-3 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function ConversationThread({
  thread,
  tenantSlug,
}: {
  thread: Thread;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Open the thread at its END (latest message), not at the top — a long
  // conversation used to require manual scrolling on every open. Also re-scroll
  // when a new message lands (own reply after router.refresh()).
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);

  async function send() {
    const trimmed = body.trim();
    if (!trimmed && !file) return;
    setBusy(true);
    setError(null);
    try {
      // Attachment path: upload the file first, then queue the reply with the
      // opaque token the server returns (never a filesystem path). Sending
      // itself still goes wa_outbox → bridge.js.
      let mediaRef: { token: string } | undefined;
      if (file) {
        const fd = new FormData();
        fd.append("slug", tenantSlug);
        fd.append("file", file);
        const res = await fetch("/api/wa/attachment", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
        mediaRef = { token: json.token };
      }
      await queueThreadReply(tenantSlug, thread.jid, trimmed, mediaRef);
      setBody("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to queue reply");
    } finally {
      setBusy(false);
    }
  }

  const title = thread.customerName ?? thread.jid;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`Conversation · ${thread.channel}`}
        icon={<MessageSquare className="h-4.5 w-4.5" />}
        action={
          <Link
            href={`/${tenantSlug}/messages`}
            className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
          </Link>
        }
      />

      {thread.customerId && (
        <div className="mb-4 text-xs text-ink-3">
          <Link
            href={`/${tenantSlug}/customers/${thread.customerId}`}
            className="text-brand-600 hover:underline"
          >
            Open customer record →
          </Link>
        </div>
      )}

      {/* No "sending disabled" banner: outbound goes through wa_outbox → the
          wa-observer Baileys drain (WA_SEND_ENABLED lives in that process), not
          the Meta Cloud API `mockMode` this used to check. Delivery works; the
          old banner falsely said "queued but not delivered". */}

      <Card className="mb-4 p-4">
        <ul className="space-y-3">
          {thread.messages.map((m) => {
            const outbound = m.direction === "outbound";
            return (
              <li key={m.id} className={cx("flex", outbound ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[80%] rounded-card px-3 py-2 text-sm",
                    outbound ? "bg-brand-600 text-white" : "bg-sunken text-ink"
                  )}
                >
                  <MessageBody body={m.body} />
                  <div
                    className={cx(
                      "mt-1 text-[10px]",
                      outbound ? "text-white/70" : "text-ink-3"
                    )}
                  >
                    {formatDateTime(m.createdAt)}
                    {outbound && m.status ? ` · ${m.status}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </Card>

      <Card className="p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={file ? "Add a caption… (optional)" : "Type a reply…"}
          className={TEXTAREA_CLS}
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {file && (
          <div className="mt-2 flex items-center gap-2 rounded-field border border-line bg-sunken/60 px-3 py-1.5 text-xs text-ink-2">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-ink-3">
              {(file.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ml-auto shrink-0 rounded p-0.5 hover:bg-line"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <Paperclip className="h-4 w-4" /> Attach
          </Button>
          <Button onClick={send} disabled={busy || (body.trim().length === 0 && !file)}>
            {busy ? "Queuing…" : "Send reply"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
