# 🌿 KarnatakaGo

AI-powered travel planner for Karnataka — budget-aware, safety-aware itineraries with live community prices, verified reviews, social features, and an admin dashboard.

Built with **Next.js 15 · React 19 · TypeScript · Supabase · Tailwind CSS v4 · MapLibre GL**.

---

## Features

### Trip Planning
- **AI planner** — generates 3 variants (Cheapest / Balanced / Safest) from budget, interests, group type, pace, and transport mode
- **Transport-aware plans** — Car (fuel stops + remote warnings), Bike (rental pickup/drop, frequent fuel stops), Bus (KSRTC boarding points), Train (IRCTC tips + station lookup), Taxi (fare estimates), Mix (cheapest combination of train + bus + rental scooter per segment)
- **Interactive map** — MapLibre GL with per-day colour-coded route, place markers, fuel/transit pins
- **AI narration** — Claude explains the plan in 6 languages (English, Kannada, Hindi, Tamil, Telugu, Malayalam)
- **Budget repair loop** — automatically downgrades tier or switches transport to stay within budget
- **Print itinerary** — full A4 print layout

### Prices & Reviews
- **Live price cards** — freshness indicator (green/amber/red), "last updated X ago", "Price changed ₹X → ₹Y" banner
- **Bargain prices** — traveller-submitted fair negotiation prices shown in green
- **Community price submissions** — KYC-verified users only
- **Hotel & food reviews** — star rating, body, price paid, bargain tip, up to 4 photos (JPG/PNG/WebP)
- **Review gate** — only KYC-verified travellers can submit; shown publicly after verification

### Auth & Profiles
- Email/password and Google OAuth via Supabase Auth
- **Profile page** — avatar upload, display name, username, bio
- **Email verification** — badge + resend button
- **Phone OTP verification** — +91 format, Supabase Phone Auth
- **Document verification (KYC)** — upload Aadhaar / PAN / Passport; admin reviews
- **Privacy controls** — share email, share phone, show QR code toggles
- **QR code** — app-signed `KGOAPP:v1:…` payload (HMAC-SHA-256, 24h expiry); canvas-rendered client-side (no external API)
- **QR scanner** — camera feed + paste fallback; scan another user's QR to start a DM

### Social
- **Private chat** — 1-to-1 DMs and group chats; Supabase Realtime (5s polling fallback)
- **Message types** — text, 🆘 help request, 📍 location, 🗺 trip share
- **Contact masking** — phone numbers, emails, URLs auto-hidden in all messages
- **Block / Report / Mute** — right-click context menu; auto-moderation on report
- **Message request flow** — accept/decline before replying to a stranger
- **Communities** — browse, join, create trip groups
- **Travel journals** — write public journals linked to saved trips
- **Share** — WhatsApp deep-link, Instagram Stories intent, copy link

### Safety
- **SOS button** — floating button on every page; calls 112 / 1091 / 100; shares GPS location via WhatsApp; notifies admin dashboard
- **Rate limiting** — OTP: 2/min per user, max 10 per 5 min → 7-min block; plan API: 20/min per IP; narrate: 10/min per IP

### Admin Dashboard (`/admin`)
- Password-protected with `ADMIN_SECRET`
- **Overview** — live counts: users, trips, reviews, open SOS, pending KYC, open reports (auto-refreshes every 15s)
- **Users** — search, approve/reject KYC, unblock OTP, ban/unban
- **SOS events** — real-time feed with location map link, mark resolved
- **Reports** — message report queue, mark reviewed

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-org/karnataka-go.git
cd karnataka-go

# 2. Install dependencies
cd apps/web && npm install

# 3. Configure environment
cp ../../.env.example .env.local
# Edit .env.local — add at minimum ANTHROPIC_API_KEY or PORTKEY_API_KEY

# 4. Set up Supabase
#    a. Create a free project at https://supabase.com
#    b. Run supabase/FULL_SCHEMA.sql in the SQL Editor
#    c. Create 3 storage buckets (see below)
#    d. Enable Email and Google auth providers
#    e. Add http://localhost:3000/auth/callback to Redirect URLs

# 5. Start dev server
npm run dev   # http://localhost:3000

# 6. Run tests
npm test
```

### Supabase storage buckets

Create these in **Supabase → Storage → New bucket**:

| Bucket | Public | Max size | MIME types |
|---|---|---|---|
| `avatars` | ✅ Yes | 2 MB | image/jpeg, image/png, image/webp |
| `kyc-docs` | ❌ No | 5 MB | image/jpeg, image/png, image/webp, application/pdf |
| `review-images` | ✅ Yes | 5 MB | image/jpeg, image/png, image/webp |

### Optional: OR-Tools route optimiser

```bash
cd apps/optimizer
pip install -r requirements.txt
uvicorn main:app --port 8000
# Then set OPTIMIZER_URL=http://localhost:8000 in .env.local
```

Without it, the engine uses nearest-neighbour ordering (works well for most trips).

---

## Project structure

```
karnataka-go/
├── apps/
│   ├── web/                    # Next.js 15 app
│   │   ├── app/                # Pages and API routes
│   │   │   ├── admin/          # Admin dashboard
│   │   │   ├── api/            # REST API routes
│   │   │   │   ├── admin/      # Stats, users, SOS, reports
│   │   │   │   ├── plan/       # Trip plan generation
│   │   │   │   ├── prices/     # Live prices + submissions
│   │   │   │   ├── profile/    # Profile, KYC, OTP, QR
│   │   │   │   ├── reviews/    # Hotel & food reviews
│   │   │   │   ├── social/     # Chat, communities, journals
│   │   │   │   └── sos/        # SOS event logging
│   │   │   ├── profile/        # Profile page
│   │   │   ├── social/         # Chat, communities, journals UI
│   │   │   ├── stay/           # Stay listings + reviews
│   │   │   ├── food/           # Food guide + reviews
│   │   │   └── prices/         # Community price dashboard
│   │   ├── components/         # Shared React components
│   │   ├── data/               # Seed JSON (places, stays, dishes)
│   │   └── lib/                # Engine, types, utilities
│   └── optimizer/              # FastAPI + OR-Tools (optional)
└── supabase/
    └── FULL_SCHEMA.sql         # Complete database schema (safe to re-run)
```

---

## Environment variables

See [`.env.example`](.env.example) for the full reference.

| Variable | Required | Description |
|---|---|---|
| `PORTKEY_API_KEY` | one of these | Portkey AI gateway key |
| `ANTHROPIC_API_KEY` | one of these | Direct Anthropic API key |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase secret key (server-only) |
| `ADMIN_SECRET` | ✅ | Protects the `/admin` page |
| `OPTIMIZER_URL` | optional | OR-Tools service URL |
| `NEXT_PUBLIC_SITE_URL` | optional | Used in auth email redirects |

---

## Data disclaimer

`apps/web/data/*.json` contains **seed estimates** for entry fees, opening hours, stay prices, and safety scores. These are illustrative only. Verify with official sources (ASI, KSTDC, Karnataka Forest Department, KSDMA) before treating them as facts. Every price in the UI is labelled `seed-estimate`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Map | MapLibre GL JS |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (email + Google OAuth) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (postgres_changes) |
| AI | Anthropic Claude via Portkey gateway |
| Route optimiser | FastAPI + OR-Tools (optional) |
| Tests | Vitest |
| Language | TypeScript |

---

## Contributing

1. Fork the repo and create a feature branch
2. Run `npm test` — all tests must pass
3. Run `npm run build` — must compile with 0 TypeScript errors
4. Open a pull request with a clear description

---

## Licence

MIT
