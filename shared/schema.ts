import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Profiles — replaces the legacy `users` table. Identity now lives in
 * `auth.users` (Supabase Auth); this row attaches the application-level role.
 * `id` matches `auth.users.id` exactly.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  role: text("role").notNull().default("User"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ createdAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Internal Companies
export const internalCompanies = pgTable("internal_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull().unique(),
});

export const insertInternalCompanySchema = createInsertSchema(internalCompanies).omit({ id: true });
export type InsertInternalCompany = z.infer<typeof insertInternalCompanySchema>;
export type InternalCompany = typeof internalCompanies.$inferSelect;

// Account Banks
export const accountBanks = pgTable("account_banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountBankSchema = createInsertSchema(accountBanks).omit({ id: true, createdAt: true });
export type InsertAccountBank = z.infer<typeof insertAccountBankSchema>;
export type AccountBank = typeof accountBanks.$inferSelect;

export const ACCOUNT_TYPE_CODES = ["CK", "SV", "CC", "LN", "OT"] as const;
export const ACCOUNT_TYPE_OPTIONS = [
  { code: "CK", label: "Checking" },
  { code: "SV", label: "Savings" },
  { code: "CC", label: "Credit Card" },
  { code: "LN", label: "Loan" },
  { code: "OT", label: "Other" },
] as const;
export type AccountTypeCode = (typeof ACCOUNT_TYPE_CODES)[number];

// Payment Accounts
export const paymentAccounts = pgTable("payment_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  accountType: text("account_type").notNull(),
  accountTypeCode: text("account_type_code").notNull(),
  internalCompanyId: varchar("internal_company_id").notNull(),
  bankId: varchar("bank_id").notNull(),
  lastFourDigits: text("last_four_digits"),
});

const accountTypeCodeSchema = z.enum(ACCOUNT_TYPE_CODES);

export const insertPaymentAccountSchema = createInsertSchema(paymentAccounts)
  .omit({ id: true, name: true, accountType: true })
  .extend({
    accountTypeCode: accountTypeCodeSchema,
    lastFourDigits: z.string().trim().regex(/^\d{4}$/, "Must be 4 digits").optional().nullable(),
  });

export type InsertPaymentAccount = z.infer<typeof insertPaymentAccountSchema>;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;

// Payment Types
export const paymentTypes = pgTable("payment_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const insertPaymentTypeSchema = createInsertSchema(paymentTypes).omit({ id: true });
export type InsertPaymentType = z.infer<typeof insertPaymentTypeSchema>;
export type PaymentType = typeof paymentTypes.$inferSelect;

// Expense Types
export const expenseTypes = pgTable("expense_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const insertExpenseTypeSchema = createInsertSchema(expenseTypes).omit({ id: true });
export type InsertExpenseType = z.infer<typeof insertExpenseTypeSchema>;
export type ExpenseType = typeof expenseTypes.$inferSelect;

// Vendors
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors)
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().trim().min(1, "Name is required"),
    abbreviation: z.string().trim().min(1, "Abbreviation is required")
      .transform((v) => v.toUpperCase()),
  });

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Payment Schedules
export const paymentSchedules = pgTable("payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: text("expense_id").notNull().unique(),
  internalCompanyId: varchar("internal_company_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorAbbreviation: text("vendor_abbreviation").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(),
  nextDueDate: timestamp("next_due_date").notNull(),
  paymentTypeId: varchar("payment_type_id").notNull(),
  paymentAccountId: varchar("payment_account_id").notNull(),
  expenseTypeId: varchar("expense_type_id").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentScheduleSchema = createInsertSchema(paymentSchedules)
  .omit({ id: true, expenseId: true, createdAt: true })
  .extend({
    nextDueDate: z.coerce.date(),
    amount: z.coerce.string().refine((v) => v !== "" && !Number.isNaN(Number(v)), "Invalid amount"),
    vendorName: z.string().min(1, "Vendor is required"),
    vendorAbbreviation: z.string().min(1, "Vendor abbreviation is required"),
    internalCompanyId: z.string().min(1, "Internal company is required"),
    paymentTypeId: z.string().min(1, "Payment type is required"),
    paymentAccountId: z.string().min(1, "Payment account is required"),
    expenseTypeId: z.string().min(1, "Expense type is required"),
  });

export type InsertPaymentSchedule = z.infer<typeof insertPaymentScheduleSchema>;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;

// Payment Records
export const paymentRecords = pgTable("payment_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentScheduleId: varchar("payment_schedule_id"),
  expenseId: text("expense_id").notNull(),
  internalCompanyId: varchar("internal_company_id").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidBy: uuid("paid_by").notNull(),
  approvedBy: uuid("approved_by"),
  paymentMethod: text("payment_method").notNull(),
  paymentAccountId: varchar("payment_account_id"),
  /** Supabase Storage path, e.g. uploads/<userId>/<yyyy-mm>/<uuid>.<ext> */
  confirmationFile: text("confirmation_file"),
  approvalScreenshot: text("approval_screenshot"),
  /** Physical check number when paid by check (e.g. "1357"). */
  checkNumber: text("check_number"),
  /** Bank/portal confirmation ID (e.g. "cfa026Unatr"). */
  referenceNumber: text("reference_number"),
  /** Free-text note (e.g. "TPM SBA loan Acct# 3971339107"). */
  memo: text("memo"),
  scheduledDueDate: timestamp("scheduled_due_date"),
  daysLate: integer("days_late").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords)
  .omit({ id: true, paidBy: true, createdAt: true, scheduledDueDate: true, daysLate: true })
  .extend({
    paymentDate: z.coerce.date(),
    amount: z.coerce.string().refine((v) => v !== "" && !Number.isNaN(Number(v)), "Invalid amount"),
    confirmationFile: z.string().nullable().optional(),
    approvalScreenshot: z.string().nullable().optional(),
    checkNumber: z.string().trim().max(64).nullable().optional(),
    referenceNumber: z.string().trim().max(128).nullable().optional(),
    memo: z.string().trim().max(500).nullable().optional(),
  });

export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;

// Payment Record Audits
export const paymentRecordAudits = pgTable("payment_record_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentRecordId: varchar("payment_record_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  beforeSnapshot: jsonb("before_snapshot").notNull(),
  afterSnapshot: jsonb("after_snapshot"),
  performedBy: uuid("performed_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentRecordAuditSchema = createInsertSchema(paymentRecordAudits).omit({ id: true, createdAt: true });
export type InsertPaymentRecordAudit = z.infer<typeof insertPaymentRecordAuditSchema>;
export type PaymentRecordAudit = typeof paymentRecordAudits.$inferSelect;

// Account Mappings (CSV import)
export const accountMappings = pgTable("account_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  csvAccountName: text("csv_account_name").notNull().unique(),
  paymentAccountId: varchar("payment_account_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountMappingSchema = createInsertSchema(accountMappings).omit({ id: true, createdAt: true });
export type InsertAccountMapping = z.infer<typeof insertAccountMappingSchema>;
export type AccountMapping = typeof accountMappings.$inferSelect;

// Audit Log
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  username: text("username"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Import jobs — for CSV imports beyond the 9s Vercel function timeout
export const importJobs = pgTable("import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | done | failed
  payload: jsonb("payload").notNull(),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});
