# Pulse — Complete guide after you receive the ZIP

Use this file **on your laptop** when your friend sends the project as a **ZIP**.  
You do **not** need the old chat — everything is here.

---

# Part 1 — What this project is (overview)

## What is Pulse?

**Pulse** is a **habit tracker web app** that runs in your browser and can be **installed on your phone** like a normal app (called a **PWA**: Progressive Web App).

It helps you:

- Log habits every day (study, fitness, mood, water, sleep, notes)
- See streaks, charts, and a growth score
- Get smart suggestions from your own data (works offline)
- Optionally use an **AI coach** if you paste a **free API key** (Google Gemini or OpenAI)

## Two ways to use it (important)

| Plan | What you do | Login? | Where is data? |
|------|-------------|--------|----------------|
| **Plan A (start here)** | Deploy to Vercel **without** Supabase keys | No | Only on **each phone/browser** (IndexedDB). Your phone and your friend’s phone do **not** share data. |
| **Plan B (later)** | Add Supabase + env vars on Vercel | Yes (email/password) | Saved **per account** in the cloud + copy on device. Same person can sync phone + laptop. |

**Recommendation:** Start with **Plan A**. Add Plan B only when you want accounts and sync.

## Main features (everything the app does)

1. **Today** — Daily dashboard: greeting, progress ring, mood, sleep, water, reflection note, habits grouped by category.
2. **Habits** — Add/edit/archive/delete habits and categories; habit types: done/not done, counter, duration (minutes), scale 1–5.
3. **Growth** — Growth score (0–100), 30-day chart, category breakdown, streak leaderboard, milestones (badges).
4. **Insights** — Consistency heatmap, mood vs performance chart, rule-based tips; optional **AI Coach** with your API key.
5. **Setup** — Theme (light/dark), accent colors, focus mode (calmer UI), AI keys, **export/import JSON**, reset app.

## Tech stack (what it’s built with)

| Piece | Role |
|-------|------|
| **React** | UI |
| **TypeScript** | Safer JavaScript |
| **Vite** | Dev server + production build |
| **Tailwind CSS** | Styling |
| **Dexie** | Saves data in the browser (**IndexedDB**) |
| **Framer Motion** | Animations |
| **Recharts** | Graphs |
| **vite-plugin-pwa** | Offline + “Install app” |
| **Supabase** (optional) | Login + cloud database — **only if you enable it** |

## Folder structure (what matters)

```
test-cursor/                 ← project root (name may differ after unzip)
├── NEXT_STEPS.md            ← this file
├── README.md                ← longer technical readme
├── SUPABASE_SETUP.md        ← only when you enable Plan B
├── package.json             ← scripts & dependencies
├── index.html               ← page shell + fonts
├── vite.config.ts           ← build + PWA settings
├── tailwind.config.js       ← colors & theme tokens
├── public/
│   └── icon.svg             ← app icon
└── src/
    ├── main.tsx             ← starts app, hooks sync
    ├── App.tsx              ← layout, tabs, theme
    ├── index.css            ← global styles & design tokens
    ├── db/
    │   ├── database.ts      ← local database schema (Dexie)
    │   └── seed.ts          ← default habits/categories
    ├── lib/
    │   ├── stats.ts         ← streaks, growth score
    │   ├── suggestions.ts   ← offline smart tips
    │   ├── ai.ts            ← optional LLM calls
    │   ├── sync.ts          ← Dexie ↔ Supabase (Plan B)
    │   ├── supabase.ts      ← cloud client (Plan B)
    │   ├── auth.ts          ← login hooks (Plan B)
    │   ├── io.ts            ← export/import JSON & CSV
    │   └── ...
    ├── components/          ← UI pieces (nav, cards, etc.)
    └── pages/               ← Today, Habits, Growth, Insights, Settings, Auth
```

## How your data is stored

- **Plan A:** Everything stays in **IndexedDB** on that device only. Clearing site data or uninstalling can lose data — use **Setup → Export JSON** as backup.
- **Plan B:** Rows sync to **your Supabase project**; Row Level Security keeps users separated.

## Scripts you will use (`npm run …`)

| Command | Meaning |
|---------|---------|
| `npm install` | Download dependencies (run once after unzip or clone). |
| `npm run dev` | Run app locally at **http://localhost:5173** |
| `npm run dev:host` | Same, but phone on same Wi‑Fi can open `http://YOUR-IP:5173` |
| `npm run build` | Build production files into `dist/` |
| `npm run preview` | Test the production build locally |

---

# Part 2 — Step by step: from ZIP on your laptop to running locally

Do these **in order**. Replace folder names if yours differ.

## Step 2.1 — Install prerequisites (once per laptop)

You need **two free tools**:

1. **Node.js** (includes `npm`)  
   - Download: https://nodejs.org — choose **LTS**.  
   - Install with defaults.

2. **Git**  
   - Download: https://git-scm.com/downloads  
   - Install with defaults.

**Check in Terminal** (Mac: Spotlight → Terminal; Windows: search “cmd” or PowerShell):

```bash
node --version
npm --version
git --version
```

Each line should print a version number. If any command fails, install that tool first.

## Step 2.2 — Unzip the project

1. Save the ZIP your friend sends you (e.g. `test-cursor.zip`).
2. **Extract** it (double‑click on Mac, or “Extract all” on Windows).
3. Put the folder somewhere easy, e.g.  
   - Mac: `Documents/test-cursor`  
   - Windows: `C:\Users\You\Documents\test-cursor`

Remember this **full path** — you need it in Terminal.

## Step 2.3 — Open Terminal in that folder

**Mac:**

```bash
cd ~/Documents/test-cursor
```

(Change `test-cursor` if the folder name is different.)

**Windows (PowerShell):**

```powershell
cd $HOME\Documents\test-cursor
```

## Step 2.4 — Install project dependencies

Still inside the project folder:

```bash
npm install
```

Wait until it finishes (may take 1–3 minutes). You should **not** see red `ERR!` at the end.

## Step 2.5 — Run the app on your laptop

```bash
npm run dev
```

Terminal shows something like:

```text
Local: http://localhost:5173/
```

1. Open **Chrome** (or Edge).
2. Go to **http://localhost:5173**
3. You should see **Pulse** — tabs at the bottom, Today screen.

To stop the server: click the Terminal window and press **Ctrl + C**.

✅ **If this works, your laptop setup is correct.**

---

# Part 3 — Step by step: push this project to **your** GitHub

ZIP projects usually **do not** include a working `.git` folder from your friend — so you **initialize Git yourself** on your laptop.

## Step 3.1 — Create a GitHub account and a new empty repo

1. Go to **https://github.com** and sign up / log in.
2. Click **+** → **New repository**.
3. Name: e.g. `pulse-habits`.
4. Choose **Private** if you don’t want the code public.
5. **Important:** Do **not** check “Add a README”, “.gitignore”, or license (the ZIP already has files).
6. Click **Create repository**.
7. Leave the page open — you need the repo URL, e.g.  
   `https://github.com/YOUR_USERNAME/pulse-habits.git`

## Step 3.2 — Set your name and email for commits (this repo only)

In Terminal, **inside the project folder**:

```bash
cd ~/Documents/test-cursor

git config user.name "Your Real Name"
git config user.email "same-email-as-github@example.com"
```

Use the email GitHub recognizes (GitHub → Settings → Emails).

## Step 3.3 — Initialize Git and first commit

```bash
git init
git add .
git commit -m "Initial commit: Pulse habit tracker"
git branch -M main
```

If `git commit` says “nothing to commit”, you may already have commits:

```bash
git status
git log --oneline -1
```

If there is history and you only need to add `origin`, skip `git init` if it errors and go to Step 3.4.

## Step 3.4 — Connect to GitHub and push

Replace `YOUR_USERNAME` and `pulse-habits` with yours:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pulse-habits.git
git push -u origin main
```

### If `remote origin already exists`

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/pulse-habits.git
git push -u origin main
```

### Login when pushing

GitHub **does not** accept your normal password for HTTPS. Use a **Personal Access Token**:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
2. **Generate new token** → enable scope **`repo`**  
3. Copy the token (starts with `ghp_…`)  
4. When Terminal asks for **Password**, paste the token (you won’t see characters — that’s normal).

✅ After success, refresh GitHub — you should see all files.

### Files that should NOT be on GitHub

Your `.gitignore` already excludes:

- `node_modules/`
- `dist/`
- `.env` and `.env.local` (secrets — never commit)

Anyone who clones runs `npm install` again to recreate `node_modules`.

---

# Part 4 — Step by step: put the app online (Plan A) and install on Android

You need a **free host** so your phone gets **HTTPS** — required for “Install app”.  
Easiest: **Vercel**.

## Step 4.1 — Install Vercel CLI (once)

```bash
npm install -g vercel
```

If permission errors on Mac:

```bash
sudo npm install -g vercel
```

## Step 4.2 — Log in to Vercel

```bash
vercel login
```

Follow the browser login (Google/GitHub).

## Step 4.3 — Deploy from your project folder

```bash
cd ~/Documents/test-cursor
vercel
```

- Answer prompts by pressing **Enter** for defaults (yes to link project, project name OK, `./` as directory).
- Wait until it prints a **preview URL**.

## Step 4.4 — Production URL

```bash
vercel --prod
```

Copy the **Production** URL (e.g. `https://pulse-habits-xxx.vercel.app`).

### Plan A reminder

Do **not** add `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` in Vercel unless you want login (Plan B).  
Without them, the app opens straight to Pulse — **no account screen**.

## Step 4.5 — Install on your Android phone

1. Open **Chrome** on the phone.
2. Paste your **Production** URL.
3. Tap **⋮** (menu) → **Install app** (or **Add to Home screen**).
4. Confirm **Install**.

You get a home screen icon; opening it runs full screen like an app. Data stays **on that phone**.

---

# Part 5 — Optional: update the app later

After you change code on your laptop:

```bash
git add .
git commit -m "Describe change"
git push
```

**Best workflow:** In Vercel dashboard, **Import** your GitHub repo once — then every `git push` auto‑deploys.  
If you only use CLI: run `vercel --prod` again after changes.

---

# Part 6 — Later: Plan B (accounts + sync)

When you’re ready:

1. Read **`SUPABASE_SETUP.md`** — create project, run SQL, copy URL + anon key.
2. In **Vercel** → your project → **Settings** → **Environment Variables**:  
   add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Redeploy**.
4. App will show **Sign in / Create account**.

---

# Part 7 — Optional AI (free tier)

1. Get a key: **https://aistudio.google.com/apikey** (Gemini) or OpenAI’s dashboard.
2. In app: **Setup** → **AI Coach** → choose provider → paste key → **Save**.
3. **Insights** → **Generate coaching**.

Key is stored **only on that device** (IndexedDB). Use **Setup → Export JSON** before resetting the phone.

---

# Part 8 — Troubleshooting (quick)

| Problem | What to try |
|---------|-------------|
| `npm install` errors | Delete `node_modules` folder and `package-lock.json`, run `npm install` again. |
| Port 5173 busy | Close other dev servers or run `npm run dev -- --port 5174` |
| Blank page after deploy | Check Vercel **Deployments** → open **Build Logs** for errors. |
| Push rejected | Pull first: `git pull origin main --rebase` then push; or force only if you’re sure: `git push -u origin main --force` (⚠️ overwrites remote history). |
| Wrong GitHub user on push | Clear saved credentials (Mac Keychain: search “github”) or use token from **your** account. |

---

# Checklist (copy for yourself)

- [ ] Install Node.js LTS + Git  
- [ ] Unzip project → `cd` into folder  
- [ ] `npm install` → `npm run dev` → open localhost — works  
- [ ] Create empty GitHub repo  
- [ ] `git init` → `git add .` → `git commit` → `git remote add origin` → `git push` with token  
- [ ] `vercel login` → `vercel` → `vercel --prod`  
- [ ] Phone: Chrome → open Production URL → Install app  
- [ ] (Later) Plan B: `SUPABASE_SETUP.md` + Vercel env vars  

---

**You’re done when:** GitHub has your code, Vercel URL opens Pulse on a browser, and your phone has the installed app icon.

Good luck.
