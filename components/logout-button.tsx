"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Record the logout in the audit log and revoke the session
          // server-side, in the background. Dispatched *before* the local
          // signOut so the session cookie is still attached to the request;
          // `keepalive` lets it finish after we navigate away. Not awaited,
          // so it never blocks the UI.
          fetch("/api/auth/logout", { method: "POST", keepalive: true });
          // `local` scope clears the session cookie without the global
          // /auth/v1/logout network round-trip (which blocks the UI for
          // ~150ms warm, up to ~900ms cold). The user is fully signed out
          // of this browser immediately.
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          router.refresh();
        })
      }
      className="
        bg-transparent border border-hp-ink text-hp-ink
        uppercase tracking-eyebrow text-[11px]
        px-5 py-2 rounded-sm
        hover:bg-hp-ink hover:text-hp-foundation
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
      "
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
