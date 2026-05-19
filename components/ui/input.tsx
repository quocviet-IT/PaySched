"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-transparent",
          "border-0 border-b border-hp-rule",
          "px-0.5 py-1.5",
          "font-body text-base text-hp-body",
          "focus:outline-none focus:border-b-2 focus:border-hp-pink focus:pb-[5px]",
          "transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
