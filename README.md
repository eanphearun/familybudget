# Family Budget — Telegram Mini App

A small budget tracker: income/expenses by category and account, shared by
your whole family, opened from inside Telegram.

## What's here

- `index.html`, `style.css`, `app.js` — the frontend (static, goes on GitHub Pages)
- `config.js` — two values you fill in after creating your Supabase project
- `schema.sql` — the database schema (the "backend"), run once inside Supabase

There is no server to write or host. Supabase gives you a hosted Postgres
database with an instant API; the frontend calls it directly.

## 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) → New project (free tier is enough).
2. Once it's created, open **SQL Editor** → New query.
3. Paste the entire contents of `schema.sql` and click Run.
4. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key.
5. Paste them into `config.js`:
   ```js
   const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGci...";
   ```

## 2. Put it on GitHub Pages

1. Create a new GitHub repo, push these 5 files to it.
2. Repo → **Settings → Pages** → Source: deploy from branch → `main` → `/root`.
3. GitHub gives you a URL like `https://yourname.github.io/family-budget/`.
   That's your Mini App URL.

## 3. Create the Telegram bot and attach the Mini App

No coding needed for this part:

1. Open [@BotFather](https://t.me/BotFather) in Telegram → `/newbot` → follow
   the prompts (name + username). It gives you a bot link like `t.me/YourFamilyBudgetBot`.
2. `/mybots` → pick your bot → **Bot Settings → Menu Button** → **Configure
   Menu Button** → paste your GitHub Pages URL.
3. Open your bot's chat — the menu button (bottom-left, next to the message
   box) now opens the Mini App. Share the bot link with your family; anyone
   who opens it gets the same shared data.

## Security note

The `anon` key is meant to be public (it's what every Supabase frontend
ships), but the schema's Row Level Security policies here are wide open —
anyone who has the key can read and write all transactions. That's a
reasonable trade-off for a private family MVP whose URL isn't shared beyond
the family, but it is **not** per-user access control. If you want that
later, the natural next step is validating Telegram's `initData` (which
proves who's opening the app) in a Supabase Edge Function and scoping RLS
policies to it — ask me if/when you want that built.

## Customizing categories or accounts

Edit the `insert into accounts` / `insert into categories` blocks in
`schema.sql` before running it, or just edit the rows directly in Supabase's
**Table Editor** later — no code changes needed either way.
