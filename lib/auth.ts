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
 * issues a fresh auth check + profile DB query — N callers per page load.
 * With cache, the second+ calls return the same in-flight Promise.
 *
 * Uses `getClaims()` rather than `getUser()`: the project signs JWTs with
 * an asymmetric key (ES256), so `getClaims()` verifies the token signature
 * locally against the JWKS (cached process-wide) instead of making a
 * network round-trip to the Auth server on every call. It still refreshes
 * an expired session and the verification is cryptographic, so this is not
 * a security trade-off.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const userId = String(claims.sub);
  const email = typeof claims.email === "string" ? claims.email : "";

  const [profile] = await db
    .select({ role: profiles.role, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return {
    id: userId,
    email,
    username: profile?.username ?? email,
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
