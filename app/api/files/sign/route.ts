import { NextRequest, NextResponse } from "next/server";
import { or, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { paymentRecords } from "@shared/schema";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

export async function GET(req: NextRequest) {
  const session = await requireUser();
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ message: "path is required" }, { status: 400 });

  // A caller may sign only their own freshly-uploaded files (`<userId>/...`)
  // or a path that is actually referenced by a payment record. Without this
  // check, any authenticated user could mint a signed URL for ANY storage
  // object by guessing/enumerating paths.
  const ownsPath = path.startsWith(`${session.id}/`);
  if (!ownsPath) {
    const [ref] = await db
      .select({ id: paymentRecords.id })
      .from(paymentRecords)
      .where(or(eq(paymentRecords.confirmationFile, path), eq(paymentRecords.approvalScreenshot, path)))
      .limit(1);
    if (!ref) return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return NextResponse.json({ message: "Failed to sign file" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
