import { requireUser } from "@/lib/auth";
import { GuideView } from "./guide-view";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  await requireUser();
  return (
    <div className="space-y-8">
      <header>
        <span className="eyebrow mb-2">Help</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">Guide</h1>
        <p className="mt-2 text-sm text-hp-muted">How to use PaySchedManager, in plain words.</p>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>
      <GuideView />
    </div>
  );
}
