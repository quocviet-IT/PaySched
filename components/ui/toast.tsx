"use client";

/**
 * Quiet inline toast — no global container needed; rendered inline by callers.
 * Per HP brand: muted text, no celebratory color, auto-dismiss in 3s.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "destructive";

interface ToastInstance {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let listeners: Array<(toasts: ToastInstance[]) => void> = [];
let toasts: ToastInstance[] = [];
let counter = 0;

export function toast(opts: { title: string; description?: string; variant?: ToastVariant }) {
  const id = ++counter;
  const t: ToastInstance = { id, ...opts };
  toasts = [...toasts, t];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    listeners.forEach((l) => l(toasts));
  }, opts.variant === "destructive" ? 5000 : 3000);
}

export function Toaster() {
  const [items, setItems] = React.useState<ToastInstance[]>(toasts);
  React.useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto bg-hp-card border border-hp-rule px-5 py-4 min-w-[280px] max-w-md",
            t.variant === "destructive" && "border-hp-pink",
          )}
        >
          <div
            className={cn(
              "uppercase tracking-eyebrow text-[11px] font-body",
              t.variant === "destructive" ? "text-hp-pink" : "text-hp-ink",
            )}
          >
            {t.title}
          </div>
          {t.description && (
            <div className="mt-1 text-sm text-hp-body">{t.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}
