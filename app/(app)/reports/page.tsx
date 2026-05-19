import { requireUser } from "@/lib/auth";
import { ReportsView } from "./reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireUser();
  return <ReportsView />;
}
