/**
 * Factory for generic CRUD Route Handlers over a Drizzle pg table.
 *
 * Returns { GET, POST, PATCH, DELETE } handlers that can be re-exported from
 * `app/api/<entity>/route.ts` and `app/api/<entity>/[id]/route.ts`.
 *
 * Usage:
 *   const { listAll, createOne } = makeCrud({
 *     table: paymentTypes,
 *     insertSchema: insertPaymentTypeSchema,
 *     requireAdminToWrite: false,
 *   });
 */
import { NextRequest, NextResponse } from "next/server";
import { eq, sql, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";

type AnyTable = PgTable & { id: any };

export interface CrudConfig<TSchema extends z.ZodTypeAny> {
  table: AnyTable;
  insertSchema: TSchema;
  /** Validate partial updates; defaults to `insertSchema.partial()`. */
  updateSchema?: z.ZodTypeAny;
  /** When true, only Admin role may create/update/delete. */
  requireAdminToWrite?: boolean;
  /** Optional transform of validated input before INSERT (e.g. compute derived fields). */
  transform?: (input: any, ctx: { userId: string }) => Promise<any> | any;
  /** Optional post-write hook (e.g. cascade audit). */
  afterCreate?: (row: any, ctx: { userId: string }) => Promise<void> | void;
  /** Override the order — defaults to `created_at desc` if present, else by id. */
  orderBy?: any;
}

export function makeCrud<S extends z.ZodTypeAny>(cfg: CrudConfig<S>) {
  const { table, insertSchema, requireAdminToWrite } = cfg;
  const updateSchema = cfg.updateSchema ?? (insertSchema as any).partial();
  const checkAuth = requireAdminToWrite ? requireAdmin : requireUser;
  const entityType = getTableName(table);

  return {
    listAll: async () => {
      await requireUser();
      const rows = await db.select().from(table);
      return NextResponse.json(rows);
    },

    createOne: async (req: NextRequest) => {
      try {
        const session = await checkAuth();
        const raw = await req.json().catch(() => ({}));
        const parsed = insertSchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
        }
        let input = parsed.data;
        if (cfg.transform) input = await cfg.transform(input, { userId: session.id });
        const [row] = await db.insert(table).values(input).returning();
        if (cfg.afterCreate) await cfg.afterCreate(row, { userId: session.id });
        await logAudit(session.id, session.username, "create", entityType, (row as any)?.id ?? null, describe(row));
        return NextResponse.json(row, { status: 201 });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        // Handle database constraint violations
        if (errorMsg.includes("unique constraint")) {
          return NextResponse.json({ message: "This record already exists" }, { status: 409 });
        }
        // Handle other database errors
        console.error("[CRUD CREATE ERROR]", { error, message: errorMsg, stack: error?.stack });
        return NextResponse.json({ message: errorMsg || "Failed to create record" }, { status: 500 });
      }
    },

    getOne: async (_req: NextRequest, { params }: { params: { id: string } }) => {
      await requireUser();
      const [row] = await db.select().from(table).where(eq((table as any).id, params.id)).limit(1);
      if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json(row);
    },

    updateOne: async (req: NextRequest, { params }: { params: { id: string } }) => {
      try {
        const session = await checkAuth();
        const raw = await req.json().catch(() => ({}));
        const parsed = updateSchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
        }
        const [row] = await db
          .update(table)
          .set(parsed.data as any)
          .where(eq((table as any).id, params.id))
          .returning();
        if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
        await logAudit(session.id, session.username, "update", entityType, params.id, describe(row));
        return NextResponse.json(row);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes("unique constraint")) {
          return NextResponse.json({ message: "This record already exists" }, { status: 409 });
        }
        console.error("[CRUD UPDATE ERROR]", { error, message: errorMsg, stack: error?.stack });
        return NextResponse.json({ message: errorMsg || "Failed to update record" }, { status: 500 });
      }
    },

    deleteOne: async (_req: NextRequest, { params }: { params: { id: string } }) => {
      try {
        const session = await checkAuth();
        const [row] = await db
          .delete(table)
          .where(eq((table as any).id, params.id))
          .returning();
        if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
        await logAudit(session.id, session.username, "delete", entityType, params.id, describe(row));
        return NextResponse.json({ ok: true });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error("[CRUD DELETE ERROR]", { error, message: errorMsg, stack: error?.stack });
        return NextResponse.json({ message: errorMsg || "Failed to delete record" }, { status: 500 });
      }
    },
  };
}

/** Short human-readable label for a row — prefers name-like columns, else id. */
function describe(row: any): string | undefined {
  if (!row || typeof row !== "object") return undefined;
  const label = row.name ?? row.username ?? row.abbreviation ?? row.expenseId ?? null;
  return label ? String(label) : undefined;
}

/** Convenience: log to audit_log via raw SQL. Never throws on failure. */
export async function logAudit(
  userId: string,
  username: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: string,
) {
  try {
    await db.execute(sql`
      insert into public.audit_log (user_id, username, action, entity_type, entity_id, details)
      values (${userId}, ${username}, ${action}, ${entityType}, ${entityId}, ${details ?? null})
    `);
    console.log("[AUDIT]", { action, entityType, entityId, username });
  } catch (err: any) {
    // Log but never block the user action.
    console.error("[AUDIT FAILED]", { action, entityType, entityId, username, error: err?.message ?? String(err) });
  }
}
