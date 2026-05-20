import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crud";

const patchSchema = z.object({
  password: z.string().min(4).optional(),
  role: z.enum(["Admin", "User"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }
  const { password, role } = parsed.data;
  const service = createServiceClient();

  const changes: string[] = [];
  if (password) {
    const { error } = await service.auth.admin.updateUserById(params.id, { password });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    changes.push("password");
  }
  if (role) {
    const { db } = await import("@/lib/db");
    const { profiles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(profiles).set({ role }).where(eq(profiles.id, params.id));
    changes.push(`role=${role}`);
  }
  if (changes.length) {
    await logAudit(session.id, session.username, "update", "users", params.id, changes.join(", "));
  }
  return NextResponse.json({ ok: true, id: params.id, byAdmin: session.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (params.id === session.id) {
    return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 });
  }
  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  await logAudit(session.id, session.username, "delete", "users", params.id);
  return NextResponse.json({ ok: true });
}
