import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, authErrorResponse } from "@/lib/auth";
import {
  paymentAccounts,
  internalCompanies,
  accountBanks,
  ACCOUNT_TYPE_OPTIONS,
} from "@shared/schema";

const updateSchema = z.object({
  internalCompanyId: z.string().optional(),
  bankId: z.string().optional(),
  accountTypeCode: z.enum(["CK", "SV", "CC", "LN", "OT"]).optional(),
  lastFourDigits: z.string().trim().regex(/^\d{4}$/).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireUser();
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const [existing] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ message: "Account not found" }, { status: 404 });

  const merged = { ...existing, ...parsed.data };
  const [company] = await db.select().from(internalCompanies).where(eq(internalCompanies.id, merged.internalCompanyId)).limit(1);
  const [bank] = await db.select().from(accountBanks).where(eq(accountBanks.id, merged.bankId)).limit(1);
  const option = ACCOUNT_TYPE_OPTIONS.find((o) => o.code === merged.accountTypeCode);
  if (!company || !bank || !option) {
    return NextResponse.json({ message: "Invalid company, bank, or account type" }, { status: 400 });
  }

  const name = [company.abbreviation, bank.nickname, merged.accountTypeCode, merged.lastFourDigits ?? ""]
    .filter(Boolean).join(" ").trim();

  const [row] = await db.update(paymentAccounts)
    .set({
      internalCompanyId: merged.internalCompanyId,
      bankId: merged.bankId,
      accountTypeCode: merged.accountTypeCode,
      accountType: option.label,
      lastFourDigits: merged.lastFourDigits ?? null,
      name,
    })
    .where(eq(paymentAccounts.id, params.id))
    .returning();
  return NextResponse.json(row);
}

export const PUT = PATCH;

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    const res = authErrorResponse(e);
    if (res) return res;
    throw e;
  }
  const [row] = await db.delete(paymentAccounts).where(eq(paymentAccounts.id, params.id)).returning();
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
