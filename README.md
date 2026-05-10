# Pulse — Personal Growth OS

> A calm, modern, local-first habit tracker for daily consistency, with
> optional cloud accounts and cross-device sync.

Built for an MCA student who wants discipline without the dopamine slot-machine
— inspired by Apple Health, Linear and Arc. Soft gradients, layered glass
cards, spring-driven microinteractions, and a focused information hierarchy.

---

## Features

### Core
- Habits, categories, mood, sleep & water, daily reflection note
- Streaks (with animated flame badges), 14-day momentum sparklines
- 0–100 weighted **Growth Index** with last-week ghost arc + Δ chip
- Trajectory area chart, category breakdown, milestones with unlock animations
- 13-week consistency heatmap, mood × performance bar chart
- Rule-based **smart suggestions** that work fully offline
- Optional **AI Coach** (OpenAI / Gemini, your own key)
- JSON / CSV export, JSON import, full reset

### Personalization
- Light + soft dark mode
- 5 accent colours (Indigo, Blue, Violet, Emerald, Rose) — re-skin the whole UI
- **Focus Mode** — kills glows, gradients and animations for deep work
- Tasteful microinteractions, framer-motion springs everywhere

### Accounts & sync (optional)
- Email + password sign in / sign up via Supabase
- Auto-sync of every habit, entry, mood, setting between devices
- Per-user data isolation via Postgres Row-Level Security
- "Push everything / Pull from cloud" manual sync buttons in Settings
- App still works completely offline once data is loaded
- Without a Supabase project the app gracefully runs in **local-only mode**

### Mobile / PWA
- Mobile-first layout with floating glass bottom-nav + center FAB
- Desktop sidebar layout for `lg+` screens
- Installable PWA — shows up like a native app on your home screen
- Offline-capable via service worker (workbox)

---

## Run it locally

Requires Node 18+.

```bash
git clone <your-fork>  ;  cd pulse
npm install
npm run dev          # http://localhost:5173
npm run dev:host     # also accessible from your phone on the same Wi-Fi
```

To enable accounts and cloud sync, follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
(takes ~10 minutes, free).

---

## Deploy + install on your phone

The output of `npm run build` is a fully static `dist/` folder. Host it
anywhere; below are the simplest free options.

### Path A — Vercel (recommended)

The easiest free option. Auto HTTPS, custom domain support, auto-redeploy on
git push.

1. Push the project to GitHub.
2. Go to <https://vercel.com> → **Import** the repo. Vercel auto-detects Vite.
3. Under **Environment Variables**, add the two Supabase values from
   [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. You get `https://<name>.vercel.app`.

Or via the CLI:

```bash
npm i -g vercel
vercel              # link to a new project
vercel --prod       # promote to production
```

### Path B — Netlify

```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

Add your env vars in **Site settings → Build & deploy → Environment**.

### Path C — Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=pulse-habits
```

Add env vars under **Pages → your project → Settings → Environment variables**.

---

### Install on Android (Chrome / Edge / Brave)

1. Open the live URL on your phone.
2. Sign in (or create an account if you set up Supabase).
3. Menu (⋮) → **Install app** (or **Add to Home Screen**).
4. Pulse appears on your home screen with the gradient icon. Launch it — it
   opens full-screen, with offline support.

### Install on iPhone

1. Open the live URL **in Safari** (Chrome on iOS doesn't trigger install).
2. Tap the **Share** button → **Add to Home Screen**.
3. Same result — full-screen, installable, offline-capable.

### Use on the web

Just open the deployed URL in any modern browser. Sign in. Done.

---

## Use without a server

If you don't want to set up Supabase, just **don't create `.env.local`**. The
app:

- Skips the auth screen.
- Stores everything in IndexedDB on your device.
- Has no login, no sync, no accounts.
- Still gives you offline support, install-as-PWA, and every other feature.

You can flip on Supabase later — your existing local data stays intact, and
you can use **Settings → Account → Push everything** to upload it.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         React + Vite + TS                        │
│                                                                  │
│   ┌────────────┐   writes   ┌──────────┐  fire-and-forget        │
│   │   Pages /  │ ─────────► │  Dexie   │ ───────► Dexie hooks    │
│   │ Components │            │(IndexedDB)│                          │
│   └────────────┘   reads    └──────────┘   ┌──────────────────┐  │
│         ▲          ◄────────                │  Supabase        │  │
│         │                                   │  (Postgres+Auth) │  │
│         │                pullAll(userId)    │  RLS: per user   │  │
│         └──────────────────────────────────►│                  │  │
│                                             └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

- Dexie hooks mirror every local create / update / delete to Supabase.
- Each row carries a stable `cloud_id` UUID generated client-side, so it
  survives across devices.
- Conflict resolution: **last-write-wins** by `updated_at`.
- Without env vars, the hooks become no-ops; everything else still works.

---

## File layout

```
src/
├── App.tsx                     # Layout + theme/accent/focus mode + AuthGate
├── main.tsx                    # installSyncHooks() + ensureSeed()
├── index.css                   # Design tokens (CSS variables) + components
│
├── db/
│   ├── database.ts             # Dexie v2 schema with cloud_id columns
│   └── seed.ts                 # Default categories + 12 default habits
│
├── lib/
│   ├── supabase.ts             # Client + isCloudEnabled flag
│   ├── auth.ts                 # useAuth hook + sign in/up/out
│   ├── sync.ts                 # Dexie ↔ Supabase sync engine
│   ├── stats.ts                # Streaks, growth score, milestones
│   ├── suggestions.ts          # Rule-based coaching engine
│   ├── ai.ts                   # OpenAI / Gemini optional coach
│   ├── io.ts                   # JSON / CSV export-import
│   ├── date.ts, useLive.ts, cn.ts
│
├── components/
│   ├── AuthGate.tsx            # Decides Auth screen vs App
│   ├── HabitCard.tsx           # Premium card w/ sparkline + flame
│   ├── Header.tsx              # Time-aware greeting
│   ├── Heatmap.tsx             # Soft rounded GitHub-style heatmap
│   ├── MoodPicker.tsx          # Animated gradient mood selector
│   ├── Navigation.tsx          # Floating glass bottom-nav + sidebar
│   └── ui/                     # Card, Button, Chip, RingProgress,
│                               # Sparkline, StreakBadge, IconTile, Modal,
│                               # Toast, Skeleton, AnimatedNumber, EmptyState
│
└── pages/
    ├── Today.tsx
    ├── Habits.tsx              # CRUD habits + categories (delete any cat)
    ├── Growth.tsx
    ├── Insights.tsx
    ├── Settings.tsx            # Account · Personalize · AI · Backup · Reset
    └── Auth.tsx                # Sign in / Create account / Forgot password
```

---

## Privacy

- **Habit data**: lives on your device + your own private Supabase project (if
  you set one up). Nobody else has access — Supabase RLS guarantees it.
- **AI Coach payload**: only aggregated stats (growth score, category percentages,
  habit names, rule-based notes) are sent to the LLM. Mood values, sleep, water,
  notes and journal text are **never** included.
- **API keys** (OpenAI / Gemini): stored only in your local IndexedDB.

---

```
Show up. Small. Daily.
```
