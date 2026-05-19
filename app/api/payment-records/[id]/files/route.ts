import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { paymentRecords, paymentRecordAudits } from "@shared/schema";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

/**
 * Update file attachments on a payment record. Requires reason — writes an audit
 * row with before/after snapshots. Accepts multipart/form-data with optional
 * `confirmationFile` and `approvalScreenshot` fields plus a required `reason`.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireUser();
  const form = await req.formData();
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return NextResponse.json({ message: "Reason is required" }, { status: 400 });

  const confirmation = form.get("confirmationFile");
  const approval = form.get("approvalScreenshot");
  if (!(confirmation instanceof File) && !(approval instanceof File)) {
    return NextResponse.json({ message: "No files provided" }, { status: 400 });
  }

  const [existing] = await db.select().from(paymentRecords).where(eq(paymentRecords.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ message: "Record not found" }, { status: 404 });

  const service = createServiceClient();
  const uploadOne = async (f: File) => {
    const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : "";
    const path = `${session.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const { error } = await service.storage.from(BUCKET).upload(path, bytes, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return path;
  };

  const patch: Record<string, string | null> = {};
  if (confirmation instanceof File) patch.confirmationFile = await uploadOne(confirmation);
  if (approval instanceof File) patch.approvalScreenshot = await uploadOne(approval);

  const [updated] = await db.update(paymentRecords).set(patch).where(eq(paymentRecords.id, params.id)).returning();

  await db.insert(paymentRecordAudits).values({
    paymentRecordId: params.id,
    action: "edit",
    reason,
    beforeSnapshot: existing as any,
    afterSnapshot: updated as any,
    performedBy: session.id,
  });

  return NextResponse.json(updated);
}
