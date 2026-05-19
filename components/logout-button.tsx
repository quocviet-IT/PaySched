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
          await supabase.auth.signOut();
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
      {pending ? "Đang thoát" : "Đăng xuất"}
    </button>
  );
}
