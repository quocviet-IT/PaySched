"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  onConfirm: () => void;
  entityLabel?: string;
  name?: string;
  pending?: boolean;
  disabled?: boolean;
}

export function ConfirmDeleteButton({
  onConfirm,
  entityLabel = "item",
  name,
  pending,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Delete" disabled={disabled}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {entityLabel}</DialogTitle>
        </DialogHeader>
        <p className="font-body text-sm text-hp-body">
          Are you sure you want to delete{" "}
          {name ? (
            <>
              <span className="text-hp-ink">{name}</span>?
            </>
          ) : (
            <>this {entityLabel}?</>
          )}{" "}
          This action cannot be undone.
        </p>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
