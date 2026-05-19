import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

export async function GET(req: NextRequest) {
  await requireUser();
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ message: "path is required" }, { status: 400 });
  const service = createServiceClient();
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
