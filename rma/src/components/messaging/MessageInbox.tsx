"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { parseChatBody } from "@/lib/chat-body";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Label,
  EmptyState,
  cx,
} from "@/components/ui";
import { ChevronLeft, ChevronRight, Inbox, MessageSquare } from "lucide-react";
import type { MessageThread } from "@/modules/messaging/queries";
import { formatDateTime } from "@/lib/format";

/* Channel chips keep recognizable brand colors (WhatsApp green, IG pink …). */
const CHANNEL: Record<string, { label: string; cls: string }> = {
  whatsapp: { label: "WhatsApp", cls: "bg-emerald-100 text-emerald-700" },
  instagram: { label: "Instagram", cls: "bg-pink-100 text-pink-700" },
  facebook: { label: "Facebook", cls: "bg-blue-100 text-blue-700" },
  localrent: { label: "Localrent", cls: "bg-amber-100 text-amber-700" },
  yango: { label: "Yango", cls: "bg-sky-100 text-sky-700" },
  email: { label: "Email", cls: "bg-sunken text-ink-2" },
  sms: { label: "SMS", cls: "bg-brand-100 text-brand-700" },
};

const TEXTAREA_CLS =
  "w-full resize-none rounded-field border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-3 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function MessageInbox({
  threads,
  total,
  page,
  pageSize,
  tenantSlug,
}: {
  threads: MessageThread[];
  total: number;
  page: number;
  pageSize: number;
  tenantSlug: string;
  tenantId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simFrom, setSimFrom] = useState("+971501234567");
  const [simName, setSimName] = useState("Test Customer");
  const [simBody, setSimBody] = useState(
    "Hi, do you have a G-Class available for rent this weekend?"
  );
  const [simBusy, setSimBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Channel filter is client-side over the current page (thread channel).
  const displayed = channelFilter
    ? threads.filter((thread) => thread.channel === channelFilter)
    : threads;

  function navigate(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function onSimulate() {
    setSimBusy(true);
    try {
      const res = await fetch("/api/integrations/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, from: simFrom, name: simName, body: simBody }),
      });
      const json = await res.json();
      if (json.ok) {
        setSimOpen(false);
        router.refresh();
      }
    } finally {
      setSimBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Message Inbox"
        subtitle={`${total.toLocaleString()} conversation${total === 1 ? "" : "s"} — threaded by sender, most recent first`}
        icon={<Inbox className="h-4.5 w-4.5" />}
        action={<Button onClick={() => setSimOpen(true)}>Simulate WhatsApp</Button>}
      />

      {/* No "sending disabled" banner: outbound goes via wa_outbox → the
          wa-observer Baileys drain, not the Meta Cloud API `mockMode` this
          checked. Delivery works; the old banner was false. */}

      {/* Channel filters (filter the current page of threads) */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setChannelFilter(null)}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            channelFilter === null
              ? "bg-brand-600 text-white"
              : "bg-sunken text-ink-2 hover:bg-line hover:text-ink"
          )}
        >
          All
        </button>
        {Object.entries(CHANNEL).map(([key, ch]) => (
          <button
            key={key}
            onClick={() => setChannelFilter(key)}
            className={cx(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              channelFilter === key ? "bg-brand-600 text-white" : `${ch.cls} hover:opacity-80`
            )}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Simulate panel */}
      {simOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setSimOpen(false)}
            role="button"
            aria-label="Close"
          />
          <div className="relative z-10 w-full max-w-md rounded-card border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Simulate WhatsApp inbound</h2>
              <Button variant="ghost" size="sm" onClick={() => setSimOpen(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <Label>From (phone)</Label>
                <Input value={simFrom} onChange={(e) => setSimFrom(e.target.value)} className="w-full" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={simName} onChange={(e) => setSimName(e.target.value)} className="w-full" />
              </div>
              <div>
                <Label>Message</Label>
                <textarea
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  rows={3}
                  className={TEXTAREA_CLS}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setSimOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onSimulate} disabled={simBusy}>
                  {simBusy ? "Simulating…" : "Send simulated message"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="No conversations"
          description={
            channelFilter
              ? `No conversations on ${CHANNEL[channelFilter]?.label ?? channelFilter} on this page.`
              : "No inbound messages yet."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title="Conversations"
            count={total}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
          />
          <ul className="divide-y divide-line-soft">
            {displayed.map((thread) => {
              const ch = CHANNEL[thread.channel] ?? {
                label: thread.channel,
                cls: "bg-sunken text-ink-2",
              };
              return (
                <li key={thread.fromJid}>
                  <Link
                    href={`/${tenantSlug}/messages/${encodeURIComponent(thread.fromJid)}`}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-sunken/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cx(
                            "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                            ch.cls
                          )}
                        >
                          {ch.label}
                        </span>
                        <span className="truncate text-sm font-medium text-ink">
                          {thread.customerName ?? thread.fromJid}
                        </span>
                        {thread.unreadCount > 0 && (
                          <Badge tone="danger">{thread.unreadCount} new</Badge>
                        )}
                        {thread.car && (
                          <span className="inline-flex max-w-[45%] items-center gap-1 truncate rounded-full bg-brand-600/10 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                            🚗 {thread.car}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-ink-3 tnum">
                          {formatDateTime(thread.latestAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-2">
                        {(() => {
                          const { kind, text } = parseChatBody(thread.latestBody);
                          const tag = { voice: "🎤 Voice", image: "🖼️ Photo", video: "🎥 Video", file: "📎 Attachment", text: "" }[kind];
                          return kind === "text" ? text : `${tag}${text ? ` · ${text}` : ""}`;
                        })()}
                      </p>
                      <div className="mt-1 text-[11px] text-ink-3 tnum">
                        {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"}
                        {thread.fromJid && (
                          <span className="ml-2 font-mono">{thread.fromJid}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-sm text-ink-2">
            <span className="tnum">
              {start}–{end} of {total.toLocaleString()} conversations
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(page - 1)}
                disabled={page <= 1}
                className="rounded-field p-1.5 transition-colors hover:bg-sunken disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 tnum">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => navigate(page + 1)}
                disabled={page >= totalPages}
                className="rounded-field p-1.5 transition-colors hover:bg-sunken disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
