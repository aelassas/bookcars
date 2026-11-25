"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLeadThread,
  getLeadReplyContext,
  getCustomerThread,
  getCustomerReplyContext,
  type LeadThreadMessage,
  type LeadReplyComposerContext,
} from "@/modules/crm/chat-queries";
import { queueLeadReply, queueCustomerReply } from "@/modules/crm/reply-actions";
import { MessageBody } from "@/components/messaging/MessageBody";
import { linkLeadByPhone, linkCustomerByPhone } from "@/modules/crm/chat-actions";
import { replyStatusDisplay } from "@/lib/wa-reply-status";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, CardHeader, Badge, Button, EmptyState, cx } from "@/components/ui";
import { MessageSquare, Search, Send } from "lucide-react";

// Simple refetch/polling for this increment — SSE/realtime push is a later
// increment (see task brief). 8s balances "feels live" against load on a
// tenant that may have many lead/customer-detail tabs open at once.
const POLL_MS = 8000;

const TEXTAREA_CLS =
  "w-full resize-none rounded-field border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-3 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3";

/**
 * The WhatsApp chat pane (thread + composer + "Найти по номеру" empty
 * state) shared by the lead detail page and the customer detail page.
 * Originally lead-only (LeadChatThread.tsx); generalized here rather than
 * forking a near-duplicate for customers — the markup, polling, and
 * composer logic are identical, only which pair of server actions gets
 * called differs, and that's a single `entityType` switch inside
 * `refetch`/`handleSend`/`handleLinkByPhone` below.
 */
export function ChatThread({
  entityType,
  tenantSlug,
  tenantId,
  entityId,
  initialThread,
  initialReplyContext,
}: {
  entityType: "lead" | "customer";
  tenantSlug: string;
  tenantId: string;
  entityId: string;
  initialThread: LeadThreadMessage[];
  initialReplyContext: LeadReplyComposerContext;
}) {
  const [thread, setThread] = useState<LeadThreadMessage[]>(initialThread);
  const [replyContext, setReplyContext] = useState<LeadReplyComposerContext>(initialReplyContext);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function refetch() {
    try {
      const [nextThread, nextCtx] =
        entityType === "lead"
          ? await Promise.all([getLeadThread(tenantId, entityId), getLeadReplyContext(tenantId, entityId)])
          : await Promise.all([getCustomerThread(tenantId, entityId), getCustomerReplyContext(tenantId, entityId)]);
      setThread(nextThread);
      setReplyContext(nextCtx);
    } catch {
      // Silent — a failed background poll shouldn't disrupt the composer;
      // the next interval tick (or the user's own send) will retry.
    }
  }

  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, tenantId, entityId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending || !replyContext) return;
    setSending(true);
    setError(null);
    try {
      if (entityType === "lead") {
        await queueLeadReply(tenantSlug, entityId, body);
      } else {
        await queueCustomerReply(tenantSlug, entityId, body);
      }
      setDraft("");
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleLinkByPhone() {
    setLinking(true);
    setError(null);
    try {
      if (entityType === "lead") {
        await linkLeadByPhone(tenantSlug, entityId);
      } else {
        await linkCustomerByPhone(tenantSlug, entityId);
      }
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find a chat.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <Card className="flex h-[calc(100vh-320px)] min-h-[480px] flex-col overflow-hidden">
      <CardHeader
        title="WhatsApp"
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        action={
          <Badge cls="bg-emerald-100 text-emerald-700">WhatsApp</Badge>
        }
      />

      {thread.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No WhatsApp chat linked"
            description={
              entityType === "lead"
                ? "No messages are linked to this lead yet. Try finding the chat by the lead's phone number."
                : "No messages are linked to this customer yet. Try finding the chat by the customer's phone number."
            }
            action={
              <Button onClick={handleLinkByPhone} disabled={linking}>
                <Search className="h-4 w-4" /> {linking ? "Searching…" : "Find by number"}
              </Button>
            }
          />
        </div>
      ) : (
        <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
          {thread.map((m, i) => {
            // Day separators: group consecutive messages sharing the same calendar day.
            const day = formatDate(m.createdAt);
            const showDaySeparator = i === 0 || day !== formatDate(thread[i - 1].createdAt);
            const outbound = m.direction === "outbound";
            const statusDisplay = outbound ? replyStatusDisplay(m.status, m.outbox, replyContext?.sendEnabled ?? false) : null;

            return (
              <div key={m.id}>
                {showDaySeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-medium text-ink-3">
                      {day}
                    </span>
                  </div>
                )}
                <div className={cx("flex", outbound ? "justify-end" : "justify-start")}>
                  <div
                    className={cx(
                      "max-w-[75%] rounded-card px-3.5 py-2.5 text-sm shadow-card",
                      outbound
                        ? "rounded-br-sm bg-brand-700 text-white"
                        : "rounded-bl-sm border border-line bg-surface text-ink"
                    )}
                  >
                    <MessageBody body={m.body} />
                    <div
                      className={cx(
                        "mt-1 flex items-center gap-2 text-[11px] tnum",
                        outbound ? "text-white/70" : "text-ink-3"
                      )}
                    >
                      <span>{formatDateTime(m.createdAt).split(" · ")[1] ?? formatDateTime(m.createdAt)}</span>
                    </div>
                    {statusDisplay && (
                      <div
                        className={cx(
                          "mt-1 text-[11px] font-medium",
                          statusDisplay.tone === "danger"
                            ? "text-rose-200"
                            : statusDisplay.tone === "warning"
                              ? "text-amber-200"
                              : statusDisplay.tone === "success"
                                ? "text-emerald-200"
                                : "text-white/70"
                        )}
                      >
                        {statusDisplay.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-line-soft p-3">
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        {!replyContext ? (
          <p className="rounded-field border border-line bg-sunken/60 px-3 py-2 text-xs text-ink-3">
            No WhatsApp line linked — link a chat by number to reply from here.
          </p>
        ) : !replyContext.sendEnabled ? (
          <p className="mb-2 rounded-field border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Sending on the &laquo;{replyContext.brandLine}&raquo; line is currently paused
            (WA_SEND_ENABLED) — messages are queued but not delivered.
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!replyContext || sending}
            rows={2}
            placeholder={replyContext ? "Type a message… (Enter to send, Shift+Enter for a new line)" : "No WhatsApp line linked"}
            className={TEXTAREA_CLS}
          />
          <Button onClick={handleSend} disabled={!replyContext || sending || !draft.trim()}>
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
