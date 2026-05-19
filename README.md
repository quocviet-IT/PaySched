# PaySchedManager — Next.js + Supabase Edition

Migration target from the existing Node + Neon edition. Built per
[PRD-vercel-supabase.md](../PaySchedManager/PRD-vercel-supabase.md).

**Stack:** Next.js 14 (App Router) · Supabase Postgres / Auth / Storage · Drizzle ORM · Tailwind · Vercel.

---

## Quick start — local dev

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Supabase

Two options:

**(A) Cloud project (recommended for first run)**
1. Create a project at https://supabase.com (region `ap-southeast-1` if you're in VN/SG/TH).
2. Project settings → API → copy `Project URL`, `anon key`, `service_role key`.
3. Project settings → Database → Connection string → copy the Transaction (6543) and Session (5432) URIs.
4. Apply the schema and policies:

   ```bash
   # In the Supabase SQL editor (or psql with DATABASE_URL_DIRECT)
   # Run these in order:
   psql "$DATABASE_URL_DIRECT" -f supabase/migrations/0001_initial.sql
   psql "$DATABASE_URL_DIRECT" -f supabase/policies/rls.sql
   psql "$DATABASE_URL_DIRECT" -f supabase/policies/storage.sql
   psql "$DATABASE_URL_DIRECT" -f supabase/seed.sql
   ```

5. In the Supabase dashboard → Authentication → Users → **Add user** with email + password. After it appears, promote to admin:

   ```sql
   update public.profiles set role = 'Admin' where username = '<your-username>';
   ```

**(B) Local stack via Supabase CLI**

```bash
npm i -g supabase
supabase start                 # spins up local Postgres + Auth + Storage on docker
supabase db reset              # applies migrations + seed.sql
```

### 3. Configure env

```bash
cp .env.local.example .env.local
# fill in the keys from step 2
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 → you should be redirected to `/login`. Sign in with the user you created in step 2 → you land on `/dashboard` showing the four stat cards (all zero on a fresh DB).

---

## Project layout

```
PaySchedManager-next/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # public login page + Server Action
│   ├── (app)/                    # signed-in surface
│   │   ├── layout.tsx            # sidebar + header + auth gate
│   │   ├── dashboard/page.tsx    # 4 stat cards (REAL — reads Postgres)
│   │   ├── schedules/page.tsx    # placeholder
│   │   ├── history/page.tsx      # placeholder
│   │   ├── reports/page.tsx      # placeholder
│   │   ├── settings/page.tsx     # placeholder
│   │   ├── audit/page.tsx        # placeholder
│   │   └── users/page.tsx        # placeholder (admin-gated)
│   ├── api/                      # route handlers (auth + cron live; rest stubbed)
│   ├── layout.tsx
│   ├── page.tsx                  # redirects to /dashboard
│   └── globals.css
├── components/                   # shared components
│   ├── logout-button.tsx
│   └── placeholder.tsx
├── lib/
│   ├── supabase/{server,browser,middleware}.ts
│   ├── db.ts                     # Drizzle client → Supabase Postgres
│   ├── auth.ts                   # getSession / requireUser / requireAdmin
│   ├── recurrence.ts             # nextDueDate, computeDaysLate
│   ├── fuzzy.ts                  # Levenshtein
│   └── utils.ts                  # cn, formatCurrency, formatDate
├── shared/
│   └── schema.ts                 # Drizzle tables (1:1 with SQL migration)
├── supabase/
│   ├── migrations/0001_initial.sql
│   ├── policies/rls.sql          # RLS for every public table
│   ├── policies/storage.sql      # uploads bucket + policies
│   ├── seed.sql                  # lookup defaults
│   └── config.toml               # Supabase CLI config
├── middleware.ts                 # session refresh + auth gate
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── vercel.json                   # cron: /api/cron/audit-cleanup
└── package.json
```

---

## What's wired up

- **Auth:** Login form → Server Action → `supabase.auth.signInWithPassword` → HTTP-only cookie. Middleware refreshes the JWT on every request and redirects unauthenticated traffic to `/login`. Logout button calls `signOut` from the browser client.
- **Database:** Drizzle client (`lib/db.ts`) on `postgres-js` with `prepare: false` so it works through Supabase's transaction pooler (port 6543). Migrations are explicit SQL under `supabase/migrations/`. Schema mirrors `shared/schema.ts` so `drizzle-kit generate` can produce future migrations.
- **RLS:** Every public table has policies; reads are authenticated, writes are admin-only for reference tables, owner-or-admin for `payment_records`.
- **Dashboard:** Reads `payment_schedules` + `payment_records` from Postgres and renders four stat cards via Server Components.
- **Cron:** `/api/cron/audit-cleanup` prunes audit rows older than 90 days; protected by `CRON_SECRET`.

## What's NOT wired up (yet)

The seven business pages other than Dashboard are placeholders. Port them from the Node edition (`client/src/pages/<name>.tsx` + `server/routes.ts`):

| Page | Source | Endpoints needed |
|---|---|---|
| Schedules | `client/src/pages/schedules.tsx` | `app/api/schedules/route.ts` + `[id]/route.ts` |
| History | `client/src/pages/history.tsx` | `app/api/records/route.ts` + `[id]/route.ts`, exports |
| Reports | `client/src/pages/reports.tsx` | `app/api/reports/route.ts` |
| Settings | `client/src/pages/settings.tsx` | `app/api/{companies,accounts,payment-types,expense-types}/route.ts` |
| Audit | `client/src/pages/audit.tsx` | `app/api/audit/route.ts` |
| Users | `client/src/pages/users.tsx` | `app/api/users/route.ts` (service-role) |

The migration plan (PRD §5) suggests ~3–5 days for this port since the React component tree from `client/src/pages` and the validation schemas in `shared/schema.ts` carry over verbatim.

---

## Common tasks

```bash
npm run dev                  # Next.js dev server
npm run typecheck            # tsc --noEmit
npm run db:generate          # generate a new migration after schema edits
npm run db:push              # push schema to Supabase without a migration file
npm run db:studio            # Drizzle Studio
```

## Deploying to Vercel

1. Push this directory to a Git repo.
2. Import into Vercel → set the environment variables from `.env.local.example`.
3. Vercel detects Next.js and configures the build automatically.
4. Vercel Cron picks up `vercel.json` and schedules `/api/cron/audit-cleanup` at 02:00 Asia/Bangkok daily (02:00 = 19:00 UTC, see `0 19 * * *`).

---

## Companion docs

- [PRD-vercel-supabase.md](../PaySchedManager/PRD-vercel-supabase.md) — full migration PRD
- [apps-script/PRD.md](../PaySchedManager/apps-script/PRD.md) — Apps Script edition spec (for behavioural parity reference)
