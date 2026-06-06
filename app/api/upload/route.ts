import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { validateUpload, safeExtension } from "@/lib/uploads";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  const invalid = validateUpload(file);
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 });

  const ext = safeExtension(file);
  const path = `${session.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const service = createServiceClient();
  const { error: upErr } = await service.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });

  const { data: signed } = await service.storage.from(BUCKET).createSignedUrl(path, 3600);
  return NextResponse.json({ path, signedUrl: signed?.signedUrl ?? null });
}
