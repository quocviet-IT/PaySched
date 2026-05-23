import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/crud";
import { paymentRecords, paymentRecordAudits, insertPaymentRecordSchema } from "@shared/schema";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireUser();
  const raw = await req.json().catch(() => ({}));
  const { reason, ...rest } = raw ?? {};
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ message: "Reason is required" }, { status: 400 });
  }
  const parsed = insertPaymentRecordSchema.partial().safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const [existing] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ message: "Record not found" }, { status: 404 });

  const patch: any = { ...parsed.data };
  if (patch.amount !== undefined) patch.amount = String(patch.amount);
  if (patch.paymentDate !== undefined) {
    const newPaymentDate = new Date(patch.paymentDate);
    patch.paymentDate = newPaymentDate;
    // Keep daysLate in sync with the new paymentDate against the original
    // scheduledDueDate snapshotted on the record at creation time.
    if (existing.scheduledDueDate) {
      const due = new Date(existing.scheduledDueDate);
      const diff = newPaymentDate.getTime() - due.getTime();
      patch.daysLate = diff <= 0 ? 0 : Math.ceil(diff / MS_PER_DAY);
    }
  }

  const [updated] = await db.update(paymentRecords).set(patch).where(eq(paymentRecords.id, params.id)).returning();

  await db.insert(paymentRecordAudits).values({
    paymentRecordId: params.id,
    action: "edit",
    reason: reason.trim(),
    beforeSnapshot: existing as any,
    afterSnapshot: updated as any,
    performedBy: session.id,
  });
  await logAudit(
    session.id,
    session.username,
    "update",
    "payment_records",
    params.id,
    `${existing.expenseId} · ${reason.trim()}`,
  );

  return NextResponse.json(updated);
}

export const PUT = PATCH;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  // Reason can come from body or query string for DELETE
  let reason = "";
  try {
    const body = await req.json();
    reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  } catch {
    reason = req.nextUrl.searchParams.get("reason")?.trim() ?? "";
  }
  if (!reason) return NextResponse.json({ message: "Reason is required" }, { status: 400 });

  const [existing] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ message: "Record not found" }, { status: 404 });

  await db.delete(paymentRecords).where(eq(paymentRecords.id, params.id));
  await db.insert(paymentRecordAudits).values({
    paymentRecordId: params.id,
    action: "delete",
    reason,
    beforeSnapshot: existing as any,
    afterSnapshot: null,
    performedBy: session.id,
  });
  await logAudit(
    session.id,
    session.username,
    "delete",
    "payment_records",
    params.id,
    `${existing.expenseId} · ${reason}`,
  );
  return NextResponse.json({ ok: true });
}
