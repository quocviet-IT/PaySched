import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profiles } from "@shared/schema";

export async function GET() {
  await requireUser();
  const rows = await db
    .select({ id: profiles.id, username: profiles.username })
    .from(profiles);
  return NextResponse.json(rows);
}
