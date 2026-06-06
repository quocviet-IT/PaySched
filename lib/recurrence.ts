export const FREQUENCY_VALUES = ["one-time", "bi-weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCY_VALUES)[number];

/**
 * Add `months` calendar months, clamping to the last valid day of the target
 * month. Plain `setMonth` overflows (Jan 31 + 1 month -> "Feb 31" -> Mar 3),
 * which would silently skip a month for end-of-month schedules. Clamping keeps
 * a Jan 31 monthly schedule landing on Feb 28/29.
 */
function addMonthsClamped(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1); // avoid overflow while shifting the month
  d.setMonth(d.getMonth() + months);
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfMonth));
  return d;
}

export function nextDueDate(from: Date | string, frequency: Frequency): Date | null {
  const d = typeof from === "string" ? new Date(from) : new Date(from);
  if (Number.isNaN(d.getTime())) return null;
  switch (frequency) {
    case "one-time":
      return null;
    case "bi-weekly":
      d.setDate(d.getDate() + 14);
      return d;
    case "monthly":
      return addMonthsClamped(d, 1);
    case "quarterly":
      return addMonthsClamped(d, 3);
    case "yearly":
      return addMonthsClamped(d, 12);
    default:
      return null;
  }
}

export function computeDaysLate(paidDate: Date | string, scheduledDueDate: Date | string | null | undefined): number {
  if (!scheduledDueDate) return 0;
  const paid = typeof paidDate === "string" ? new Date(paidDate) : paidDate;
  const due = typeof scheduledDueDate === "string" ? new Date(scheduledDueDate) : scheduledDueDate;
  if (Number.isNaN(paid.getTime()) || Number.isNaN(due.getTime())) return 0;
  const ms = paid.getTime() - due.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
