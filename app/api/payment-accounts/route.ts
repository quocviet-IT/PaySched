import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  paymentAccounts,
  internalCompanies,
  accountBanks,
  insertPaymentAccountSchema,
  ACCOUNT_TYPE_OPTIONS,
} from "@shared/schema";

export async function GET() {
  await requireUser();
  return NextResponse.json(await db.select().from(paymentAccounts));
}

export async function POST(req: NextRequest) {
  await requireUser();
  const raw = await req.json().catch(() => ({}));
  const parsed = insertPaymentAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const { internalCompanyId, bankId, accountTypeCode, lastFourDigits } = parsed.data;

  const [company] = await db.select().from(internalCompanies).where(eq(internalCompanies.id, internalCompanyId)).limit(1);
  const [bank] = await db.select().from(accountBanks).where(eq(accountBanks.id, bankId)).limit(1);
  const option = ACCOUNT_TYPE_OPTIONS.find((o) => o.code === accountTypeCode);
  if (!company || !bank || !option) {
    return NextResponse.json({ message: "Invalid company, bank, or account type" }, { status: 400 });
  }

  const name = [company.abbreviation, bank.nickname, accountTypeCode, lastFourDigits ?? ""]
    .filter(Boolean).join(" ").trim();

  const [row] = await db.insert(paymentAccounts).values({
    name,
    accountType: option.label,
    accountTypeCode,
    internalCompanyId,
    bankId,
    lastFourDigits: lastFourDigits ?? null,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}
