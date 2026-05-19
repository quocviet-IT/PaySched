import { Placeholder } from "@/components/placeholder";

export default function AuditPage() {
  return (
    <Placeholder
      title="Audit Log"
      portFrom="client/src/pages/audit.tsx (Node edition)"
      next="Port the audit list (200 latest). Per-record audit trail lives at GET /api/record-audits?recordId=..."
    />
  );
}
