import { requireUser } from "@/lib/auth";
import { SettingsTabs } from "./settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Settings</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">
          Configuration
        </h1>
        <p className="mt-3 text-sm text-hp-body">
          Manage internal companies, payment accounts, types, and team access.
        </p>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>
      <SettingsTabs isAdmin={user.role === "Admin"} />
    </div>
  );
}
