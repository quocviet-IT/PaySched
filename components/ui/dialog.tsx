"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-hp-ink/40 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out",
      "motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, "aria-describedby": ariaDescribedBy, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    {/*
      Center the modal with a flex wrapper instead of translate-x/y on the
      Content itself. The tailwindcss-animate `zoom-in-95` keyframe rewrites
      the `transform` property during the animation; combining that with
      `translate-[-50%]` centering caused the modal to briefly appear off
      to the top-left and slide back to center, producing the "jumpy" feel.
      The wrapper is `pointer-events-none` so background clicks still reach
      the Overlay's close handler; the Content re-enables pointer events
      for itself.
    */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "pointer-events-auto relative w-full max-w-lg",
          "bg-hp-card border border-hp-rule p-8",
          "shadow-[0_8px_32px_rgba(42,39,37,0.10)]",
          "max-h-[calc(100vh-2rem)] overflow-y-auto",
          "origin-center",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out",
          "motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-5 top-5 text-hp-muted hover:text-hp-ink transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-6 space-y-2", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-title text-[24px] leading-tight text-hp-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-hp-body", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-7 flex justify-end gap-3", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";
