# Fit Happens

Personal health tracking PWA — food, water, activity, meditation, and daily notes. One user, one Supabase project, installable on Android (and iOS via Safari).

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — dark-first mobile design
- **Supabase** — Postgres database, Row-Level Security, Auth, Storage (meal photos)
- **Anthropic Claude API** — food photo analysis, daily suggestions
- **next-pwa** — service worker, offline caching, installable PWA

---

## Getting started

### 1. Clone and install

```bash
git clone <repo>
cd fit-happens
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy your **Project URL** and **anon public** key.

### 3. Apply the database schema

In the Supabase dashboard, go to **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, indexes, and the meal-photos storage bucket.

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
```

Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com).

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database schema

| Table | Purpose |
|---|---|
| `profiles` | User stats (age, height, weight, activity level, goal) + calculated targets |
| `food_logs` | Meal entries with AI-identified foods, macros, prep method, and AI tip |
| `water_logs` | Timestamped water intake entries in ml |
| `activity_logs` | Exercise sessions with type, duration, intensity, calories burned |
| `workout_plans` | Named workout plans with exercises JSON |
| `meditation_logs` | Sessions with type, duration, mood before/after |
| `daily_notes` | One free-text note per day with mood, energy, and symptom tags |

All tables enforce Row-Level Security — users can only access their own data.

---

## Calculated targets

When you save your profile (age + height + weight + activity level + goal), the app automatically calculates:

- **Calories** — Mifflin-St Jeor BMR × activity multiplier ± goal adjustment
- **Protein** — 1.6–2.2g × body weight depending on goal
- **Fibre** — fixed 30g (standard recommendation)
- **Water** — 35ml × body weight

---

## PWA / install on Android

1. Open the app in Chrome on Android.
2. Tap the three-dot menu → **Add to Home screen**.
3. The app installs with full-screen mode, the green theme, and the app icon.

For iOS (Safari): tap **Share → Add to Home Screen**.

> Icons in `public/icons/` are placeholders. Replace with real PNG icons at the listed sizes for production. Use a tool like [maskable.app](https://maskable.app) to create maskable icons.

---

## Project structure

```
fit-happens/
├── app/
│   ├── api/                       # API routes (server-only)
│   │   ├── food-log/route.ts      # GET/POST food logs
│   │   ├── food-log/analyze/      # POST photo → Claude analysis
│   │   ├── water-log/route.ts
│   │   ├── activity-log/route.ts
│   │   ├── meditation/route.ts
│   │   ├── notes/route.ts
│   │   ├── profile/route.ts
│   │   └── workout/route.ts
│   ├── dashboard/                 # Dashboard (server component + client child)
│   ├── log/                       # Logging pages
│   ├── profile/                   # Profile & targets
│   ├── login/                     # Auth
│   └── layout.tsx                 # Root layout with PWA meta
├── components/
│   ├── dashboard/DashboardClient.tsx
│   ├── layout/BottomNav.tsx
│   └── ui/ProgressRing.tsx
├── lib/
│   ├── supabase/client.ts         # Browser client
│   ├── supabase/server.ts         # Server client (cookies)
│   ├── supabase/types.ts          # TypeScript DB types
│   ├── anthropic.ts               # Food analysis + suggestions
│   ├── utils.ts                   # Calorie/macro calculators
│   └── constants.ts
├── public/
│   ├── manifest.json              # PWA manifest
│   └── icons/                     # App icons (replace with real PNGs)
├── supabase/migrations/
│   └── 001_initial_schema.sql     # Full DB schema + RLS
├── middleware.ts                  # Session refresh + auth redirect
└── next.config.mjs                # next-pwa config
```

---

## Deploying to Vercel

```bash
vercel --prod
```

Add the three environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
