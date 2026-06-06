"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

/**
 * Desktop sidebar navigation with two pieces of feedback the server-rendered
 * layout can't provide on its own:
 *  - the current route is highlighted (`aria-current="page"`)
 *  - clicking another item shows a spinner on THAT item until the new page is
 *    ready. Navigation runs inside `useTransition`, so `isPending` stays true
 *    while the App Router fetches/renders the target server component, and we
 *    remember which href was clicked to scope the spinner to that one item.
 */
export function SidebarNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Once the route actually changes, the navigation is done — clear the spinner.
  useEffect(() => {
    setTarget(null);
  }, [pathname]);

  function handleClick(e: React.MouseEvent, href: string) {
    if (isActive(href)) return; // already on this page
    e.preventDefault();
    setTarget(href);
    startTransition(() => router.push(href));
  }

  return (
    <nav className="px-3 py-6 flex flex-col gap-px">
      {nav.map((item) => {
        const active = isActive(item.href);
        const loading = target === item.href && isPending;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleClick(e, item.href)}
            aria-current={active ? "page" : undefined}
            aria-busy={loading || undefined}
            className={[
              "px-4 py-2.5 uppercase tracking-eyebrow text-[11px]",
              "transition-colors duration-150 flex items-center gap-3",
              active
                ? "bg-hp-inset text-hp-ink"
                : "text-hp-body hover:text-hp-ink hover:bg-hp-inset",
            ].join(" ")}
          >
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
