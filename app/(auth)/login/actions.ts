"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/crud";

/**
 * Sign in by username (not email). Steps:
 *   1. Look up profiles.username → profiles.id
 *   2. Service-role: admin.getUserById(id) → auth.users.email
 *   3. supabase.auth.signInWithPassword({ email, password })
 *
 * Supabase Auth still owns the credential check; username is just a friendlier
 * identifier for the finance team.
 */
export async function signIn(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectedFrom") ?? "/dashboard");

  if (!username || !password) {
    return { error: "Please enter both username and password" };
  }

  // 1. Resolve username → user id
  const [profile] = await db
    .select({ id: profiles.id, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (!profile) {
    return { error: "Invalid username or password" };
  }

  // 2. Resolve user id → email (service-role bypasses RLS)
  const service = createServiceClient();
  const { data: userResp, error: userErr } = await service.auth.admin.getUserById(profile.id);
  if (userErr || !userResp?.user?.email) {
    return { error: "Invalid username or password" };
  }

  // 3. Sign in with the resolved email
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: userResp.user.email,
    password,
  });
  if (error) {
    await logAudit(profile.id, profile.username, "login_failed", "users", profile.id, "Invalid password");
    return { error: "Invalid username or password" };
  }

  await logAudit(profile.id, profile.username, "login", "users", profile.id);
  revalidatePath("/", "layout");
  redirect(redirectTo);
}
