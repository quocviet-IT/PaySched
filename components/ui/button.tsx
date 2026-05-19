"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-hp-ink text-hp-foundation hover:bg-hp-pink",
  secondary:
    "bg-transparent border border-hp-ink text-hp-ink hover:bg-hp-ink hover:text-hp-foundation",
  ghost:
    "bg-transparent text-hp-body hover:bg-hp-inset hover:text-hp-ink",
  destructive:
    "bg-transparent border border-hp-pink text-hp-pink hover:bg-hp-ink hover:text-hp-foundation hover:border-hp-ink",
};

const sizes: Record<Size, string> = {
  default: "px-[22px] py-[10px] text-xs",
  sm: "px-3 py-1.5 text-[11px]",
  icon: "p-1.5 w-8 h-8 inline-flex items-center justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", asChild = false, ...props }, ref) => {
    const Comp: any = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "uppercase tracking-eyebrow font-body rounded-sm",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          size !== "icon" && sizes[size],
          size === "icon" && sizes.icon,
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
