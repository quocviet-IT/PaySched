import { requireUser } from "@/lib/auth";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  return <DashboardView isAdmin={user.role === "Admin"} sessionUserId={user.id} />;
}
