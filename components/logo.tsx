import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Visual scale: "sm" for sidebar, "lg" for login screen. */
  size?: "sm" | "lg";
}

/**
 * Brand mark: pink "P" + "PaySchedManager" in serif on a single baseline.
 * Two presentational sizes are pre-tuned for the sidebar (sm) and login (lg).
 */
export function Logo({ className, size = "sm" }: LogoProps) {
  const monoSize = size === "lg" ? "text-[64px]" : "text-[40px]";
  const wordSize = size === "lg" ? "text-[28px]" : "text-[18px]";
  const gap = size === "lg" ? "gap-3" : "gap-2";

  return (
    <div className={cn("flex items-baseline font-title leading-none", gap, className)}>
      <span className={cn("font-title text-hp-pink", monoSize)} aria-hidden="true">
        P
      </span>
      <span className={cn("font-title text-hp-ink", wordSize)}>
        PaySchedManager
      </span>
    </div>
  );
}
