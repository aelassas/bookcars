import { auth } from "@/platform/auth";
import { getPortalData } from "@/modules/portal/queries";
import { Car, FileText, LifeBuoy } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  StatCard,
  Table,
  TH,
  TD,
} from "@/components/ui";
import SignInButton from "./SignInButton";

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Customer Portal</h1>
        <p className="mt-2 text-sm text-ink-2">
          Sign in with your email to view your rentals, payments, and contracts.
        </p>
        <SignInButton />
      </div>
    );
  }

  const data = await getPortalData("take-auto");
  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">No account found</h1>
        <p className="mt-2 text-sm text-ink-2">
          We couldn&apos;t find a rental account linked to {session.user.email}.
        </p>
      </div>
    );
  }

  const { customer, rentals } = data;
  const activeRentals = rentals.filter((r) => r.rental.status === "active" || r.rental.status === "reserved");
  const pendingAmount = activeRentals.reduce((sum, r) => sum + (r.rental.balanceDue ?? 0), 0);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">My Account</h1>
      <p className="mt-0.5 text-sm text-ink-2">Welcome back, {customer.name}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Balance due"
          value={`AED ${pendingAmount.toLocaleString()}`}
          tone={pendingAmount > 0 ? "amber" : "emerald"}
        />
        <StatCard label="Active rentals" value={activeRentals.length} />
        <StatCard
          label="Account since"
          value={new Date(customer.createdAt).toLocaleDateString()}
        />
      </div>

      {activeRentals.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <CardHeader
            title="Your vehicles"
            count={activeRentals.length}
            icon={<Car className="h-3.5 w-3.5" />}
          />
          <div className="flex flex-col gap-3 p-4">
            {activeRentals.map((r) => (
              <div
                key={r.rental.id}
                className="rounded-field border border-line bg-sunken/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-ink">
                    {r.vehicleMake} {r.vehicleModel}
                    {r.vehicleYear ? ` (${r.vehicleYear})` : ""}
                  </div>
                  <Badge tone={r.rental.status === "active" ? "success" : "info"}>
                    {r.rental.status}
                  </Badge>
                </div>
                <div className="text-xs text-ink-3">Plate: {r.vehiclePlate}</div>
                <div className="mt-1 text-xs text-ink-3 tnum">
                  {new Date(r.rental.startDate).toLocaleDateString()} → {new Date(r.rental.returnDate).toLocaleDateString()}
                </div>
                {r.rental.balanceDue > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-field border border-warn-line bg-warn-soft px-2 py-1.5">
                    <span className="text-xs font-medium text-warn">Balance due</span>
                    <span className="text-xs font-bold text-warn tnum">
                      AED {r.rental.balanceDue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Payment schedule" />
        {activeRentals.length === 0 ? (
          <p className="p-4 text-sm text-ink-3">No scheduled payments.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Vehicle</TH>
                <TH>Due date</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {activeRentals.map((r) => (
                <tr key={r.rental.id} className="transition-colors hover:bg-sunken/60">
                  <TD className="font-medium text-ink">
                    {r.vehicleMake} {r.vehicleModel}
                  </TD>
                  <TD className="tnum">
                    {new Date(r.rental.returnDate).toLocaleDateString()}
                  </TD>
                  <TD className="font-medium text-ink tnum">
                    AED {r.rental.balanceDue.toLocaleString()}
                  </TD>
                  <TD>
                    <Badge tone={r.rental.balanceDue > 0 ? "danger" : "success"}>
                      {r.rental.balanceDue > 0 ? "due" : "paid"}
                    </Badge>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Contract documents" icon={<FileText className="h-3.5 w-3.5" />} />
        <p className="p-4 text-sm text-ink-2">
          Your lease agreements and insurance documents are available on request from our Security team.
        </p>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Renewal & support" icon={<LifeBuoy className="h-3.5 w-3.5" />} />
        <div className="p-4">
          <p className="text-sm text-ink-2">
            Need to extend your rental? Contact our team or call +971 4 000 0000.
          </p>
          <Button className="mt-3">Request renewal</Button>
        </div>
      </Card>
    </div>
  );
}
