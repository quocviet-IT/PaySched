export const FREQUENCY_VALUES = ["one-time", "bi-weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCY_VALUES)[number];

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
      d.setMonth(d.getMonth() + 1);
      return d;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      return d;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
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
