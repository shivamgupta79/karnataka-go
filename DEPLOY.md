# Deploying KarnatakaGo to Render

This guide walks through deploying both the Next.js web app and the optional OR-Tools
optimiser to [Render](https://render.com) using the `render.yaml` blueprint.

---

## Prerequisites

- A Render account (free tier works)
- The repo pushed to GitHub or GitLab
- A Supabase project with the schema applied (`supabase/FULL_SCHEMA.sql`)
- One of: a Portkey API key or an Anthropic API key

---

## Step 1 — Connect the repo to Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
2. Connect your GitHub/GitLab account and select the `karnataka-go` repo
3. Render detects `render.yaml` automatically and shows two services:
   - `karnataka-go-web` (Next.js)
   - `karnataka-go-optimizer` (FastAPI, optional)
4. Click **Apply** — Render queues the first build

---

## Step 2 — Set environment variables

Render will pause on services marked `sync: false` and ask you to fill in secrets.
Go to each service → **Environment** tab and add:

### karnataka-go-web

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (keep secret) |
| `PORTKEY_API_KEY` | Portkey key (or leave blank) |
| `ANTHROPIC_API_KEY` | Anthropic key (fallback if no Portkey) |
| `ADMIN_SECRET` | Strong random string (see below) |
| `NEXT_PUBLIC_SITE_URL` | `https://karnataka-go-web.onrender.com` |
| `OPTIMIZER_URL` | URL of the optimizer service (optional) |

Generate a strong `ADMIN_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### karnataka-go-optimizer (optional)
No additional env vars needed — it has no secrets.

---

## Step 3 — Update Supabase auth redirect URLs

In your Supabase dashboard → **Authentication → URL Configuration → Redirect URLs**, add:
```
https://karnataka-go-web.onrender.com/auth/callback
```

---

## Step 4 — Deploy

Trigger a manual deploy from the Render dashboard or push a commit to your default branch.
Render builds automatically on every push to `main` (configurable).

Build time is typically 3–5 minutes for the Next.js app.

---

## Free-tier notes

Render's free tier spins down services after 15 minutes of inactivity — the first request
after a cold start takes ~30 seconds. To avoid this:
- Upgrade to the **Starter** plan ($7/month) for always-on
- Or use an external uptime monitor (e.g. UptimeRobot) to ping `/api/banners` every 10 minutes

---

## Build commands summary

| Service | Build command | Start command |
|---|---|---|
| web | `npm install && npm run build` | `npm run start` |
| optimizer | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Both commands are run from the service's `rootDir` (`apps/web` and `apps/optimizer`).

---

## Verify the deployment

Once deployed, check:

```
GET https://karnataka-go-web.onrender.com/api/banners
# → { "banners": [] }   (empty array is fine — no banners created yet)

GET https://karnataka-go-optimizer.onrender.com/health
# → { "ok": true }
```
