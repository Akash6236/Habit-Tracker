# Supabase setup (10 minutes, free)

This is the only setup needed to enable accounts, login, registration, and
auto-sync between your phone and laptop. The app **also works without
Supabase** — if you skip this, the app simply runs in local-only mode.

---

## 1 · Create your project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project** → choose a name (e.g. `pulse-habits`), pick the closest region,
   set a strong DB password (you won't need it day-to-day), click **Create**.
3. Wait ~2 minutes for provisioning.

---

## 2 · Grab your two public keys

In your project: **Project Settings → API**.

| Field on Supabase | Goes into your `.env.local` as |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` `public` key | `VITE_SUPABASE_ANON_KEY` |

Both are safe to commit to a public repo. The actual security comes from the
Row-Level Security (RLS) policies you create in the next step.

---

## 3 · Create the tables (one SQL paste)

In Supabase: **SQL Editor → New query** → paste the SQL below → **Run**.

```sql
-- ──────────────────────────────────────────────────────────────────────
-- Pulse — Habits  ·  Database schema
-- All tables are per-user. Row-Level Security ensures one user can never
-- see another user's data, even if they have the anon key.
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  name        text not null,
  color       text not null,
  weight      int  not null default 1,
  builtin     boolean default false,
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists public.habits (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_key  text not null,
  name          text not null,
  type          text not null,
  target        double precision,
  unit          text,
  emoji         text,
  active        boolean not null default true,
  created_at    bigint  not null,
  archived_at   bigint,
  updated_at    timestamptz not null default now()
);

create table if not exists public.entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  habit_id    uuid not null,
  date        text not null,
  value       double precision not null,
  note        text,
  updated_at  timestamptz not null default now(),
  unique (user_id, habit_id, date)
);
create index if not exists entries_user_date_idx on public.entries (user_id, date);

create table if not exists public.day_logs (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          text not null,
  mood          int,
  sleep_hours   double precision,
  water_ml      int,
  reflection    text,
  updated_at    timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.settings (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  value       text not null,
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

-- ──────────────────────────────────────────────────────────────────────
-- Row-Level Security: each user sees only their own rows
-- ──────────────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.habits     enable row level security;
alter table public.entries    enable row level security;
alter table public.day_logs   enable row level security;
alter table public.settings   enable row level security;

create policy "own categories" on public.categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habits"     on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries"    on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own day_logs"   on public.day_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings"   on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

You should see `Success. No rows returned.`

---

## 4 · (Optional) Disable email confirmation for instant testing

Default Supabase requires users to click an email link to confirm. For a
personal project this gets in the way:

**Authentication → Providers → Email** → uncheck **"Confirm email"** → Save.

You can re-enable this later for production.

---

## 5 · Plug the keys into the app

Create a `.env.local` file at the project root (same folder as `package.json`):

```bash
cd /Users/karthikbhat/Documents/test/test-cursor
cp .env.example .env.local
```

Edit `.env.local` and paste your two values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs....
```

Restart the dev server:

```bash
npm run dev
```

That's it. The app now shows a **Sign in / Create account** screen on first
load. Once you're logged in, every habit, entry, mood and setting auto-mirrors
to your Supabase project, and signing in on another device pulls everything
back down.

---

## How it works (under the hood)

- The app uses **Dexie hooks** (`creating` / `updating` / `deleting`) to
  intercept every local DB write and mirror the row to Supabase
  automatically. You don't need to think about sync.
- Each row carries a stable `cloud_id` (UUID) generated client-side. That's
  what Supabase uses as the primary key, so the same row stays the same row
  across devices.
- Conflict resolution: **last-write-wins by `updated_at`**.
- "Push everything" / "Pull from cloud" buttons in **Settings → Account** let
  you force a manual full sync any time.
- Signing out wipes the local cache (your cloud copy stays put). Signing back
  in re-pulls everything.

---

## Cost

Supabase free tier:
- 500 MB Postgres
- 50,000 monthly active users
- 5 GB bandwidth/month
- Auto-pause after 7 days of inactivity (just open the project to wake it)

A daily habit log for one person uses **kilobytes per year**. You will not get
near the free tier ceiling.
