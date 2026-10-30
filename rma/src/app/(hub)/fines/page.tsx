import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import FinesTable from "./FinesTable";

export const dynamic = "force-dynamic";

export default async function FinesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/fines");
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold">Fines &amp; Salik</h1>
        <span className="text-xs text-ink-2">
          RTA fines + Salik tolls for every rented car · sheet refreshes hourly
        </span>
      </div>
      <div className="px-5 pb-5">
        <FinesTable />
      </div>
    </div>
  );
}
