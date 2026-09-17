# GECI Tally

Official student election counting system for **Government Engineering College Idukki**.

Staff enter vote counts, a supervisor verifies each round, and results publish live on a public page.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS + shadcn-style UI
- Framer Motion + Recharts

## Setup

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL, anon key, and service role key.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Database

In the Supabase SQL editor, run in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/seed.sql` (optional demo posts/candidates)

Then in **Database → Replication**, confirm `count_rounds` and `count_entries` are in the `supabase_realtime` publication (the migration adds them).

### 4. First admin user

In **Authentication → Users**, create a user (email/password). Then:

```sql
update public.profiles
   set role = 'admin',
       full_name = 'Election Admin'
 where id = '<auth-user-uuid>';
```

Staff and supervisor accounts should be created from `/admin` so roles and post assignments are applied correctly.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles

| Path | Role | Purpose |
|---|---|---|
| `/admin` | admin | Posts, candidates, staff, count limit, election state |
| `/staff` | staff | Enter per-candidate counts for assigned posts |
| `/supervisor` | supervisor | Verify or reject submitted rounds |
| `/results` | public | Live animated results (no login) |

## Counting rules

- A round is all candidate counts for one post, saved in a single Postgres transaction.
- Duplicate submits are blocked in the UI (disabled button + ref guard) and in the database (`unique (post_id, staff_id, round_number)`).
- Verified rounds become part of the live tally.
- When verified rounds for a post reach `count_limit`, those totals are finalised and immutable.
- `count_limit` can be raised mid-election for remaining ballots.
