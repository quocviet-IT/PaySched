import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/crud";

export async function POST() {
  const session = await getSession();
  const supabase = createClient();
  await supabase.auth.signOut();
  if (session) {
    await logAudit(session.id, session.username, "logout", "users", session.id);
  }
  return NextResponse.json({ ok: true });
}
