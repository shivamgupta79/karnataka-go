# 🌿 KarnatakaGo

> AI-powered travel planner for Karnataka — budget-aware, safety-aware itineraries with live community prices, verified reviews, real-time chat, document verification, and a full admin dashboard.

**Stack:** Next.js 15 · React 19 · TypeScript · Supabase (Postgres + Realtime + Storage) · Tailwind CSS v4 · MapLibre GL · Claude AI

---

## Screenshots

| Trip Planner | Itinerary + Map | Auth Page |
|---|---|---|
| Transport-aware plan builder | Day-by-day timeline with MapLibre map | Karnataka landmark showcase |

---

## Features

### 🗺 Trip Planning
- **AI planner** — 3 variants per trip: Cheapest · Balanced · Safest
- **Transport-aware plans** — each mode generates contextually correct timeline items:
  - 🚗 **Car** — fuel stops every 250 km, ⚠️ remote ghat warnings when no petrol within 80 km
  - 🛵 **Bike** — rental pickup/drop at start/end, fuel stops every 120 km, 50 km ghat warnings
  - 🚌 **Bus** — KSRTC boarding points, hub transfers, Airavat/Rajahamsa booking tips
  - 🚂 **Train** — nearest station lookup, IRCTC tips, bus-to-railhead fallback if no station nearby
  - 🚕 **Taxi** — per-segment fare estimates, remote area advance booking warnings
  - 🔀 **Mix** — cheapest combination: train for >150 km, KSRTC for 50–150 km, rental scooter locally
- **Budget repair loop** — auto-downgrades tier and transport to stay within budget; lists every change
- **6 languages** — AI narration in English, Kannada, Hindi, Tamil, Telugu, Malayalam
- **Interactive map** — MapLibre GL with colour-coded per-day routes and typed markers (fuel, boarding, ghat, stay, meal)
- **Print itinerary** — full A4 print layout with map, cost breakdown and packing checklist
- **Save & share** — saved trips get a public `/trip/[id]` shareable link

### 💰 Prices & Reviews
- **Live price cards** — freshness indicator (green/amber/red), "last updated X ago", "Price changed ₹X → ₹Y" banner
- **Bargain prices** — traveller-submitted negotiation tips shown in green
- **Community price submissions** — KYC-verified users only, pending admin approval
- **Hotel & food reviews** — star rating, body, price paid, bargain tip, up to 4 photos (JPG/PNG/WebP, max 5 MB each)
- **Review gate** — only KYC-verified travellers submit; published only after admin approves
- **`/prices` dashboard** — browse all community price submissions by category

### 🔐 Auth & Profile
- Email/password + Google OAuth via Supabase Auth
- **Profile page** (`/profile`):
  - 📸 Avatar upload → Supabase Storage `avatars` bucket
  - ✏️ Display name, username (3–20 chars, lowercase), bio
  - ✉️ Email — green ✓ Verified badge + resend confirmation button
  - 📱 Phone OTP — +91 format, send/verify with Supabase Phone Auth
  - 🪪 Document verification (KYC) — upload Aadhaar / PAN / Passport → stored in `kyc-docs` bucket
  - 🔒 Privacy toggles — share email, share phone, show QR code
- **QR code system** — app-internal signed payload `KGOAPP:v1:<base64({uid,ts})>:<HMAC-SHA256>`, canvas-rendered client-side (no external API), 24-hour expiry
- **QR scanner** — camera feed + paste-text fallback; scan another user's QR to start a DM instantly

### 💬 Social
- **Private chat** — 1-to-1 DMs and group chats
- **Supabase Realtime** subscription with 5-second polling fallback
- **Message types** — 💬 text · 🆘 help request · 📍 location share · 🗺 trip share
- **Contact masking** — phone numbers, emails, URLs auto-hidden in all messages (server-side before DB insert, and before GET response)
- **Block / Report / Mute** — right-click context menu; auto-moderation on report
- **Message request flow** — accept/decline bar before replying to a stranger
- **QR connect** — scan another user's QR to immediately open or resume their DM
- **Communities** — browse public, join/leave, create trip groups
- **Travel journals** — write public journals linked to saved trips
- **Share** — WhatsApp `wa.me` deep-link, Instagram Stories intent, copy link

### 🚨 Safety
- **SOS button** — floating on every page; calls 112 / 1091 / 100; shares GPS via WhatsApp; notifies admin dashboard instantly
- **Ghat road warnings** — ⚠️ timeline items on mountain/forest roads
- **Monsoon alerts** — badges when travelling Jun–Sep on ghat routes
- **Safety scores** — every place has a safety score; women-solo group gets minimum 0.70 threshold

### 🛡 Admin Dashboard (`/admin`)
Password-protected (`ADMIN_SECRET`). 7 tabs:

| Tab | Function |
|---|---|
| 📊 Overview | Live counts: users, trips, pending reviews, open SOS, KYC pending, reports, active banners. Auto-refresh every 30 s |
| 📢 Banners | Create/edit/delete clickable banners and ads. Live colour picker + preview. Position: top / inline / bottom. Schedule start & end dates |
| 🪪 KYC | View uploaded documents (signed URL, 10 min expiry). One-click Approve (user becomes verified) or Reject |
| ⭐ Reviews | Pending hotel and food reviews with photos, ratings, prices. Approve to publish or Reject to delete |
| 👥 Users | Search, Unblock OTP, Ban, Unban |
| 🚨 SOS | Real-time emergency feed with GPS map link, mark resolved |
| 🚩 Reports | Message report queue, mark reviewed |

### 🔒 Security
- **API key protection** — `SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY` are server-only; build-time guard throws if any are accidentally set as `NEXT_PUBLIC_` variables
- **Admin route guard** — middleware blocks every `/api/admin/*` request with 403 before the route handler runs; page uses `admin_secret` cookie (`SameSite=Strict`)
- **Security headers** on every response (middleware + next.config):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Content-Security-Policy` — restricts scripts/styles/images/connect to known origins
  - `X-Powered-By` and `Server` headers removed
- **OTP rate limiting** — 2 OTPs/min per user, max 10 in 5 min → 7-min block; admin can unblock
- **API rate limiting** — plan: 20/min per IP; narrate: 10/min per IP; SOS: 5/min per IP

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/shivamgupta79/karnataka-go.git
cd karnataka-go

# 2. Install
cd apps/web && npm install

# 3. Configure environment
cp ../../.env.example .env.local
# Edit .env.local — minimum: one of PORTKEY_API_KEY or ANTHROPIC_API_KEY,
# plus all three Supabase keys and ADMIN_SECRET

# 4. Set up Supabase (see below)

# 5. Start
npm run dev        # http://localhost:3000

# 6. Test
npm test           # 20 tests across mask, QR, and QR encoder
```

---

## Supabase Setup

### 1. Create a project
[supabase.com](https://supabase.com) → New project → choose Mumbai or Singapore region.

### 2. Run the schema
Open **SQL Editor → New query**, paste the entire contents of `supabase/FULL_SCHEMA.sql` and click **Run**.

This creates all 13 sections in one shot:

| Section | Tables |
|---|---|
| 0 | `CREATE EXTENSION postgis` |
| 1 | `user_contacts`, `profiles` |
| 2 | `kyc_verifications` |
| 3 | `places`, `stays`, `prices`, `restaurants`, `dishes`, `photo_spots`, `safety_flags` |
| 4 | `trips`, `trip_items`, `checklists` |
| 5 | `hotel_reviews`, `food_reviews` |
| 6 | `price_submissions` |
| 7 | `conversations`, `conversation_members`, `messages` |
| 8 | `communities`, `community_members` |
| 9 | `journals` |
| 10 | `user_blocks`, `message_reports`, `user_mutes` |
| 11 | `reviews` (legacy) |
| 12 | `sos_events` |
| 13 | `banners` |

> The script is fully **idempotent** — safe to re-run on an existing database.

> **Note on `spatial_ref_sys`:** PostGIS creates this table in the `public` schema. Supabase's security advisor flags it as missing RLS — this is a known false positive. You cannot alter it (owned by `supabase_admin`). Dismiss it in **Dashboard → Database → Advisors → Security**.

### 3. Create storage buckets

Go to **Supabase → Storage → New bucket** and create:

| Bucket | Public | Max size | Allowed MIME types |
|---|---|---|---|
| `avatars` | ✅ Yes | 2 MB | `image/jpeg, image/png, image/webp` |
| `kyc-docs` | ❌ No | 5 MB | `image/jpeg, image/png, image/webp, application/pdf` |
| `review-images` | ✅ Yes | 5 MB | `image/jpeg, image/png, image/webp` |

The storage RLS policies are included in `FULL_SCHEMA.sql` (bottom section).

### 4. Enable auth providers
**Authentication → Providers:**
- ✅ Email (enabled by default)
- ✅ Google (needs a GCP OAuth client ID)
- ✅ Phone (needs a Twilio/MessageBird account for OTP SMS)

**Authentication → URL Configuration → Redirect URLs:**
```
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

---

## Environment Variables

Copy `.env.example` to `apps/web/.env.local`:

```bash
cp .env.example apps/web/.env.local
```

| Variable | Required | Exposed to browser | Description |
|---|---|---|---|
| `PORTKEY_API_KEY` | One of these two | ❌ Server only | Portkey AI gateway (recommended) |
| `ANTHROPIC_API_KEY` | One of these two | ❌ Server only | Direct Anthropic fallback |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ Public | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ Server only | Supabase service role (bypasses RLS) |
| `ADMIN_SECRET` | ✅ | ❌ Server only | Protects `/admin` and `/api/admin/*` |
| `NEXT_PUBLIC_SITE_URL` | Optional | ✅ Public | Used in auth email redirects |
| `OPTIMIZER_URL` | Optional | ❌ Server only | OR-Tools route optimiser URL |

> ⚠️ **Never** prefix `SERVICE_ROLE_KEY`, `ADMIN_SECRET`, or AI keys with `NEXT_PUBLIC_`. The build will throw if you do.

### Generate a strong ADMIN_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Project Structure

```
karnataka-go/
├── apps/
│   ├── web/                          # Next.js 15 app
│   │   ├── app/
│   │   │   ├── admin/                # 🛡 Admin dashboard (7 tabs)
│   │   │   ├── api/
│   │   │   │   ├── admin/            # stats · users · banners · kyc · reviews · sos · reports
│   │   │   │   ├── banners/          # Public banner feed
│   │   │   │   ├── narrate/          # Claude AI narration
│   │   │   │   ├── plan/             # Trip plan generation
│   │   │   │   ├── prices/           # Live prices + community submissions
│   │   │   │   ├── profile/          # Profile CRUD · avatar · KYC · OTP · QR lookup
│   │   │   │   ├── reviews/          # Hotel & food reviews
│   │   │   │   ├── save-trip/        # Save trip to DB
│   │   │   │   ├── social/           # Chat · communities · journals · block · report · mute
│   │   │   │   └── sos/              # SOS event logging
│   │   │   ├── auth/                 # Login/signup with Karnataka showcase
│   │   │   ├── food/                 # Food guide + reviews
│   │   │   ├── my-trips/             # Saved trips list
│   │   │   ├── prices/               # Community price dashboard
│   │   │   ├── profile/              # User profile page
│   │   │   ├── social/               # Chat · communities · journals
│   │   │   ├── stay/                 # Stay listings + reviews
│   │   │   └── trip/                 # Trip view / shared trip
│   │   ├── components/
│   │   │   ├── BannerStrip.tsx       # Clickable site banners (admin-managed)
│   │   │   ├── Itinerary.tsx         # Day-by-day itinerary with map
│   │   │   ├── MapView.tsx           # MapLibre GL interactive map
│   │   │   ├── PlannerForm.tsx       # Trip preference form
│   │   │   ├── PriceCard.tsx         # Live price with freshness indicator
│   │   │   ├── PriceSubmitModal.tsx  # Community price submission
│   │   │   ├── QRCodeDisplay.tsx     # Canvas QR renderer (no external API)
│   │   │   ├── QRScanner.tsx         # Camera + paste-text QR scanner
│   │   │   ├── ReviewCard.tsx        # Review display with photos
│   │   │   ├── ReviewSubmitModal.tsx # Review form with photo upload
│   │   │   ├── ShareModal.tsx        # WhatsApp / Instagram / copy link
│   │   │   ├── SOSButton.tsx         # Floating emergency button
│   │   │   ├── UserMenu.tsx          # Header user dropdown
│   │   │   └── VerificationBadge.tsx # KYC status badge
│   │   ├── data/
│   │   │   ├── places.json           # 20+ Karnataka places (seed estimates)
│   │   │   ├── stays.json            # Stay listings (seed estimates)
│   │   │   └── dishes.json           # Regional dish guide
│   │   └── lib/
│   │       ├── engine.ts             # Trip planning engine (score · route · simulate · budget repair)
│   │       ├── env.ts                # Server env validation + secret leak guard
│   │       ├── geo.ts                # Haversine · road distance · nearest-order · k-means
│   │       ├── mask.ts               # Contact info masking for chat
│   │       ├── prices.ts             # Price freshness utilities
│   │       ├── qr.ts                 # QR payload sign/verify (HMAC-SHA-256)
│   │       ├── qrcode.ts             # Pure-TS QR encoder (ISO/IEC 18004)
│   │       ├── rateLimit.ts          # In-process rate limiter + OTP limits
│   │       ├── types.ts              # Shared TypeScript types
│   │       ├── useAuth.ts            # Auth hook (Supabase session + actions)
│   │       └── supabase/
│   │           ├── client.ts         # Browser Supabase client
│   │           ├── server.ts         # Server Supabase client (SSR cookies)
│   │           └── service.ts        # Service-role client (admin ops only)
│   └── optimizer/                    # Optional FastAPI + OR-Tools route optimiser
│       ├── main.py
│       └── requirements.txt
└── supabase/
    └── FULL_SCHEMA.sql               # ← Run this. Complete schema, idempotent.
```

---

## Optional: OR-Tools Route Optimiser

Without it, the engine uses nearest-neighbour ordering (works well for most trips).
With it, OR-Tools produces better multi-day routes.

```bash
cd apps/optimizer
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Then set `OPTIMIZER_URL=http://localhost:8000` in `.env.local`.

---

## Data Disclaimer

`apps/web/data/*.json` contains **seed estimates** for entry fees, opening hours, stay prices, and safety scores. These are illustrative only — not real-time data. Verify with official sources:
- Entry fees: [ASI](https://asi.nic.in), [KSTDC](https://www.kstdc.co)
- Wildlife: [Karnataka Forest Department](https://aranya.gov.in)
- Safety: [KSDMA](https://ksndmc.org)

Every price in the UI is labelled `seed-estimate`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Map | MapLibre GL JS + OpenFreeMap tiles |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (Email + Google + Phone OTP) |
| Storage | Supabase Storage (avatars, KYC docs, review images) |
| Realtime | Supabase Realtime (`postgres_changes`) |
| AI | Anthropic Claude via Portkey gateway |
| QR | Pure-TypeScript encoder (ISO/IEC 18004) + HMAC-SHA-256 signing |
| Route optimiser | FastAPI + Google OR-Tools (optional) |
| Testing | Vitest (20 tests: mask, QR sign/verify, QR encoder) |
| Language | TypeScript (strict, 0 errors) |

---

## API Reference

### Public endpoints (no auth needed)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/plan` | Generate 3-variant trip plan |
| `GET` | `/api/banners` | Active banners/ads for the site |
| `GET` | `/api/reviews/hotels?place_id=` | Approved hotel reviews |
| `GET` | `/api/reviews/food?restaurant_id=` | Approved food reviews |
| `GET` | `/api/prices?entity_type=&entity_id=` | Live prices for a place |

### Authenticated endpoints (Supabase session required)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/narrate` | AI narration for a plan |
| `POST` | `/api/save-trip` | Save trip to user account |
| `GET/PATCH` | `/api/profile` | Get/update profile |
| `POST` | `/api/profile/avatar` | Upload profile photo |
| `GET/POST` | `/api/profile/kyc` | KYC document upload |
| `POST` | `/api/profile/verify-phone` | Send/verify phone OTP |
| `POST` | `/api/profile/resend-email` | Resend confirmation email |
| `GET` | `/api/profile/lookup/[uid]` | Resolve scanned QR user |
| `POST` | `/api/prices/submit` | Submit community price (KYC required) |
| `POST` | `/api/reviews/hotels` | Submit hotel review (KYC required) |
| `POST` | `/api/reviews/food` | Submit food review (KYC required) |
| `POST` | `/api/sos` | Log SOS event |
| `GET/POST` | `/api/social/conversations` | Chat conversations |
| `GET/POST` | `/api/social/conversations/[id]/messages` | Chat messages |
| `POST` | `/api/social/conversations/connect` | QR-connect DM |
| `GET/POST` | `/api/social/communities` | Communities |
| `POST/DELETE` | `/api/social/communities/[id]/join` | Join/leave community |
| `GET/POST` | `/api/social/journals` | Travel journals |
| `GET/POST/DELETE` | `/api/social/block` | Block/unblock users |
| `POST` | `/api/social/report` | Report a message |
| `GET/POST/DELETE` | `/api/social/mute` | Mute/unmute users |

### Admin endpoints (`x-admin-secret` header required)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Dashboard counts |
| `GET` | `/api/admin/users` | User list with KYC status |
| `PATCH` | `/api/admin/users/[uid]` | Ban · unban · approve/reject KYC · unblock OTP |
| `GET/POST` | `/api/admin/banners` | Banner management |
| `PATCH/DELETE` | `/api/admin/banners/[id]` | Edit/delete banner |
| `GET/PATCH` | `/api/admin/kyc` | KYC review queue |
| `GET/PATCH` | `/api/admin/reviews` | Review moderation queue |
| `GET/PATCH` | `/api/admin/sos` | SOS event feed |
| `GET/PATCH` | `/api/admin/reports` | Message report queue |

---

## Contributing

1. Fork → create a feature branch
2. `npm test` — all 20 tests must pass
3. `npm run build` — 0 TypeScript errors
4. Open a pull request with a clear description of what changed and why

---

## Licence

MIT — see [LICENSE](LICENSE) file.

---

*Prices and safety scores are illustrative estimates. Emergency: **112** · Women helpline: **1091** · Tourist helpline: **1800-425-0087***
