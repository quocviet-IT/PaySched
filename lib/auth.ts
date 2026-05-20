import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { db } from "./db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

export type Role = "Admin" | "User";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

/**
 * Cached per request: layout + page both call `requireUser()`, and the
 * settings/users pages also call it. Without React's `cache()` each call
 * issues a fresh Supabase Auth round-trip + profile DB query — 2 RTTs ×
 * N callers per page load. With cache, the second+ calls return the
 * same in-flight Promise.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db
    .select({ role: profiles.role, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    id: user.id,
    email: user.email ?? "",
    username: profile?.username ?? user.email ?? "",
    role: (profile?.role as Role) ?? "User",
  };
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.role !== "Admin") {
    throw new Error("Admin role required");
  }
  return session;
}
