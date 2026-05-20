import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crud";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const supabase = createClient();

  // Re-authenticate with current password to prevent session hijack changing the password.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });
  if (signInError) {
    return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 500 });
  }

  await logAudit(session.id, session.username, "change_password", "auth", session.id, "self");
  return NextResponse.json({ ok: true });
}
