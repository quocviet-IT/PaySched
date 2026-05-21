"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export function MobileNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // Close drawer on resize to ≥ md (sidebar replaces it).
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    // Lock body scroll while drawer open.
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden p-2 -ml-2 text-hp-ink hover:text-hp-pink"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-hp-card border-r border-hp-rule flex flex-col">
            <div className="h-20 border-b border-hp-rule px-6 flex items-center justify-between">
              <Logo size="sm" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="p-1 text-hp-muted hover:text-hp-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 py-6 flex flex-col gap-px">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 uppercase tracking-eyebrow text-[11px] text-hp-body hover:text-hp-ink hover:bg-hp-inset transition-colors duration-150 flex items-center gap-3"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
