import Link from "next/link";
import {
  LayoutDashboard, BarChart3, Settings as SettingsIcon, ClipboardList, Users, UserCircle,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";

const BASE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { href: "/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
  { href: "/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4 shrink-0" /> },
  { href: "/audit", label: "Audit", icon: <ClipboardList className="h-4 w-4 shrink-0" /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    ...BASE_NAV,
    ...(user.role === "Admin"
      ? [{ href: "/users", label: "Users", icon: <Users className="h-4 w-4 shrink-0" /> }]
      : []),
    { href: "/account", label: "Account", icon: <UserCircle className="h-4 w-4 shrink-0" /> },
  ];

  return (
    <div className="flex min-h-screen bg-hp-foundation">
      <aside className="hidden md:flex md:flex-col w-60 border-r border-hp-rule bg-hp-card">
        <div className="h-20 border-b border-hp-rule px-6 flex items-center">
          <Logo size="sm" />
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
                flex items-center gap-3
              "
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-hp-rule bg-hp-card px-4 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MobileNav nav={nav} />
            <div className="md:hidden">
              <Logo size="sm" />
            </div>
            <div className="hidden sm:block space-y-0.5 min-w-0">
              <span className="eyebrow">Signed in</span>
              <div className="font-body text-sm text-hp-ink truncate">
                {user.username}
                <span className="text-hp-muted"> · {user.role}</span>
              </div>
            </div>
          </div>
          <LogoutButton />
        </header>
        <div className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
