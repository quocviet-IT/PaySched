import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UsersView } from "./users-view";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== "Admin") redirect("/dashboard");
  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Access</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Users</h1>
        <p className="mt-3 text-sm text-hp-body">
          Create accounts, reset passwords, and assign roles.
        </p>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>
      <UsersView />
    </div>
  );
}
