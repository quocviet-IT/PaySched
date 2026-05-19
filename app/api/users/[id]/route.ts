import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

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

  if (password) {
    const { error } = await service.auth.admin.updateUserById(params.id, { password });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (role) {
    const { db } = await import("@/lib/db");
    const { profiles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(profiles).set({ role }).where(eq(profiles.id, params.id));
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
  return NextResponse.json({ ok: true });
}
