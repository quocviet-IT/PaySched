import { requireUser } from "@/lib/auth";
import { AuditView } from "./audit-view";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireUser();
  return <AuditView />;
}
