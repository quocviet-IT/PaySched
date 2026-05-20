import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@shared/schema";
import { logAudit } from "@/lib/crud";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Invalid credentials" }, { status: 401 });
  }
  const [profile] = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);
  await logAudit(data.user.id, profile?.username ?? data.user.email ?? null, "login", "users", data.user.id);
  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
}
