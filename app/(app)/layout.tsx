import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
  { href: "/audit", label: "Audit" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = NAV;

  return (
    <div className="flex min-h-screen bg-hp-foundation">
      <aside className="w-60 border-r border-hp-rule bg-hp-card">
        <div className="h-20 border-b border-hp-rule px-7 flex flex-col justify-center">
          <span className="eyebrow">Hung Phat</span>
          <span className="font-title text-xl text-hp-ink leading-tight mt-0.5">
            PaySched
          </span>
        </div>
        <nav className="px-3 py-6 flex flex-col gap-px">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="
                px-4 py-2.5
                uppercase tracking-eyebrow text-[11px] text-hp-body
                hover:text-hp-ink hover:bg-hp-inset
                transition-colors duration-150
              "
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-20 border-b border-hp-rule bg-hp-card px-8 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="eyebrow">Signed in</span>
            <div className="font-body text-sm text-hp-ink">
              {user.email}
              <span className="text-hp-muted"> · {user.role}</span>
            </div>
          </div>
          <LogoutButton />
        </header>
        <div className="flex-1 px-8 py-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
