import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { profiles } from "@shared/schema";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crud";

export async function GET() {
  await requireAdmin();
  const rows = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      role: profiles.role,
      createdAt: profiles.createdAt,
    })
    .from(profiles);
  return NextResponse.json(rows);
}

const createSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(4),
  role: z.enum(["Admin", "User"]).default("User"),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }
  const { username, password, role } = parsed.data;

  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, username)).limit(1);
  if (existing.length) {
    return NextResponse.json({ message: "Username already exists" }, { status: 409 });
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: `${username}@paysched.local`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    return NextResponse.json({ message: error?.message ?? "Failed to create user" }, { status: 500 });
  }

  // Trigger inserts the profile; ensure role + username are correct.
  await db
    .update(profiles)
    .set({ role, username })
    .where(eq(profiles.id, data.user.id));

  await logAudit(session.id, session.username, "create", "users", data.user.id, `${username} (${role})`);
  return NextResponse.json({ id: data.user.id, username, role }, { status: 201 });
}
