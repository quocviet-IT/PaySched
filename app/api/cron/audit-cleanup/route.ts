import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Vercel Cron target — runs daily (see vercel.json).
 * Prunes audit_log rows older than 90 days.
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` automatically
 * when the cron is configured with a secret. We require it explicitly so the
 * endpoint cannot be abused.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("authorization");
  if (!expected || got !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("audit_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
