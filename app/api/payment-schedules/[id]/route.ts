import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { paymentSchedules, insertPaymentScheduleSchema } from "@shared/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  const [row] = await db.select().from(paymentSchedules).where(eq(paymentSchedules.id, params.id)).limit(1);
  if (!row) return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  const parsed = insertPaymentScheduleSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }
  const patch: any = { ...parsed.data };
  if (patch.amount !== undefined) patch.amount = String(patch.amount);

  const [row] = await db.update(paymentSchedules).set(patch).where(eq(paymentSchedules.id, params.id)).returning();
  if (!row) return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
  return NextResponse.json(row);
}

export const PUT = PATCH;

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin();
  const [row] = await db.delete(paymentSchedules).where(eq(paymentSchedules.id, params.id)).returning();
  if (!row) return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
