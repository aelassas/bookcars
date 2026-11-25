import { Link2 } from "lucide-react";
import { db } from "@/platform/db/client";
import { user } from "@/platform/db/schema";
import { listPendingTelegramLinks, approveTelegramLink } from "@/modules/auth-otp/actions";
import { PageHeader, Card, CardHeader, Table, TH, TD, Select, Button, EmptyState } from "@/components/ui";

// Admin-approved first-link fallback for Telegram PREMIUM login (mig 0040).
// otp-bot/bot.js queues a chat here (telegram_link_pending) whenever an
// incoming /start login_<token> can't be matched to a user by phone — the
// phones we can pre-populate on user.phone are shared business WhatsApp
// numbers, not staff's personal Telegram numbers, so this is the expected
// (not exceptional) path for most first-time links. Gated by the /admin
// layout (requirePlatformAdmin) same as every other /admin/* page;
// listPendingTelegramLinks/approveTelegramLink additionally accept any
// tenant_admin (see requireLinkAdmin in modules/auth-otp/actions.ts) since
// this table has no tenant scope of its own — the layout gate here is just
// stricter, which is fine.

export const dynamic = "force-dynamic";

export default async function TelegramLinksPage() {
  const [pending, users] = await Promise.all([
    listPendingTelegramLinks(),
    db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .orderBy(user.email),
  ]);

  return (
    <div>
      <PageHeader
        title="Telegram links"
        subtitle="Chats that messaged the login bot but couldn't be auto-matched to a user by phone. Pick the right person to link them."
        icon={<Link2 className="h-4.5 w-4.5" />}
      />

      <Card className="overflow-hidden">
        <CardHeader title="Pending links" count={pending.length} />
        {pending.length === 0 ? (
          <EmptyState
            title="Nothing pending"
            description="No unresolved Telegram chats right now."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Telegram user</TH>
                <TH>Phone shared</TH>
                <TH>Chat ID</TH>
                <TH>Requested</TH>
                <TH colSpan={2}>Link to user</TH>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} className="align-top transition-colors hover:bg-sunken/40">
                  <TD>
                    <div className="font-medium text-ink">{p.tgFirstName || "—"}</div>
                    <div className="text-ink-3">{p.tgUsername ? `@${p.tgUsername}` : "no username"}</div>
                  </TD>
                  <TD className="text-ink-2">{p.phone ?? "—"}</TD>
                  <TD className="font-mono text-xs text-ink-3">{p.chatId}</TD>
                  <TD className="text-ink-3 tnum">{p.requestedAt.toLocaleString()}</TD>
                  <TD colSpan={2}>
                    <form
                      action={approveTelegramLink.bind(null, p.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Select name="userId" required defaultValue="" className="min-w-[220px]">
                        <option value="" disabled>
                          Select user…
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name ? `${u.name} — ${u.email}` : u.email}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="secondary">
                        Approve
                      </Button>
                    </form>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
