import { requireUser } from "@/lib/auth";
import { AccountView } from "./account-view";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-10">
      <header>
        <span className="eyebrow mb-2">Profile</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Account</h1>
        <p className="mt-3 text-sm text-hp-body">
          Signed in as <span className="text-hp-ink">{user.username}</span> · {user.role}
        </p>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>
      <AccountView />
    </div>
  );
}
