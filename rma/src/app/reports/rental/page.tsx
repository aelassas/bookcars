import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import RentalReport from "./RentalReport";

export const dynamic = "force-dynamic";

export default async function RentalReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/reports/rental");
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold">Rental reports</h1>
        <span className="text-xs text-ink-2">All times Asia/Dubai</span>
      </div>
      <div className="px-5 pb-8">
        <RentalReport />
      </div>
    </div>
  );
}
