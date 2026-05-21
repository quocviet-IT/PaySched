"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  /** Total number of items across all pages. */
  total: number;
  /** Current page, 1-indexed. */
  page: number;
  /** Items per page. */
  pageSize: number;
  /** Called with the new page number. */
  onPageChange: (page: number) => void;
  /** Optional list of page-size choices. Defaults to [25, 50, 100]. */
  pageSizeOptions?: number[];
  /** Called when the user picks a new page size. Required if pageSizeOptions shown. */
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  pageSizeOptions = [25, 50, 100],
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
      <div className="uppercase tracking-eyebrow text-[11px] text-hp-muted">
        {from}–{to} of {total}
      </div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 uppercase tracking-eyebrow text-[11px] text-hp-muted">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-transparent border-0 border-b border-hp-rule px-1 py-1 font-body text-sm text-hp-ink focus:outline-none focus:border-hp-pink"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="uppercase tracking-eyebrow text-[11px] text-hp-body min-w-[5rem] text-center">
            Page {current} / {totalPages}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next page"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
