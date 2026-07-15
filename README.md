# Global KMCC Anganganadi Panchayath — Backend

Node.js / Express / MongoDB backend. Built in phases; this README covers
everything shipped so far.

## Phase 1 — Foundation
- All 12+ database models, JWT auth (admin + member), refresh-token
  rotation, RBAC, security middleware stack, Cloudinary/email/cron
  scaffolding, seed script. See git history / comments for details.

## Phase 2 — Members, Registration & Membership Cards
- **Public self-registration** (`POST /api/public/members/register`) that
  mirrors the KMCC membership form you shared: Panchayath/Zone (with "Not in
  list" free-text fallback), Native Place, Coordinator (with fallback),
  Working Country, Mandalam Committee, Name, Mobile, optional Email, 4-digit
  Birth Year, and an optional photo. Creates the member in `pending` status
  with a temporary `PENDING-*` ID.
- **Zone** and **Coordinator** are now their own admin-manageable
  collections (`/api/zones`, `/api/coordinators`), with public read-only
  listing endpoints (`/api/public/zones`, `/api/public/coordinators`) to
  power the form's dropdowns.
- **Admin moderation**: `GET /api/members/pending`, `POST /api/members/:id/approve`
  (assigns a real `GKAP-YYYY-######` membership ID, a password, and
  membership start/expiry dates from the chosen plan) and
  `POST /api/members/:id/reject`.
- **Full member CRUD**: search/filter/paginate, create (admin-direct,
  bypasses pending), update (with photo replacement), delete, bulk delete.
- **Lifecycle actions**: suspend / reactivate, renew (archives the previous
  cycle into `membershipHistory`), transfer (hand a membership to a new
  person), reset password.
- **Membership card**: `GET /api/members/:id/card` (admin) and
  `GET /api/dashboard/card` (member, self) stream a generated PDF — QR code
  (verifiable at `/api/public/members/verify/:membershipId`), photo, and all
  the fields from the spec (ID, name, address, blood group, working
  country, membership type, expiry, status, emergency contact).
- **Member dashboard self-service**: family member CRUD
  (`/api/dashboard/family`), profile update requests
  (member submits → admin reviews/approves at `/api/dashboard/profile-update-requests`).
- **Excel export** (`GET /api/members/export`) and an admin stats endpoint
  (`GET /api/members/stats`: totals, upcoming expiries, country breakdown,
  today's birthdays) for the dashboard.

## Setup

```bash
cp .env.example .env
# fill in MongoDB Atlas URI, JWT secrets, Cloudinary + SMTP credentials

npm install
npm run seed       # super admin + default settings + starter membership plans
npm run dev         # http://localhost:5000
```

## Verifying it works

```bash
npm run test:e2e
```

This runs the full registration → admin approval → member login → card
download → family member → Excel export flow against **your own**
MongoDB (whatever `MONGO_URI` is in `.env`), using throwaway records it
cleans up afterwards. Safe to run against a dev/staging database.

You'll also want to seed at least one Zone and Coordinator so the public
registration form's dropdowns aren't empty:

```bash
curl -X POST http://localhost:5000/api/zones -H "Content-Type: application/json" \
  -b "accessToken=<your admin accessToken cookie>" \
  -d '{"name":"വള്ളിക്കുന്ന്","nameEnglish":"Vallikkunnu"}'
```

## Folder structure

```
src/
  config/        MongoDB + Cloudinary configuration
  controllers/   auth, member, familyMember, dashboard, zone, coordinator
  models/        Mongoose schemas (Admin, Member, FamilyMember, Zone,
                 Coordinator, MembershipPlan, Committee, Poster, Gallery,
                 News, Event, Carousel, Download, Settings)
  routes/        Express routers (auth, public, members, dashboard, zones,
                 coordinators)
  middlewares/   auth, error handling, rate limiting, upload, validation
  services/      email, membership card (QR+PDF), Excel export/import
  utils/         ApiError, ApiResponse, asyncHandler, token helpers,
                 ID generator, pagination
  validators/    Zod schemas (auth, member, familyMember)
  jobs/          Membership expiry cron job
  seed/          Database seed script
test-e2e.mjs     Setup-verification smoke test (run with npm run test:e2e)
```

## Phase 3 — Content Modules
Every module follows the same pattern: a public GET (no auth) for the
landing site, `/admin/all` + full CRUD behind `requireAdmin()`, and
Cloudinary handling image/file replacement (deleting the old asset when a
new one is uploaded).

- **Committee** (`/api/committee`) — grouped by `type`
  (executive/secretariat/it_team/womens_wing/youth_wing) and `year`, with a
  `PATCH /reorder` endpoint for drag-and-drop priority ordering.
- **Posters** (`/api/posters`) — `status` (draft/published/scheduled/archived)
  plus `publishAt`/`expireAt`; the public listing only returns posters that
  are published and inside their visibility window.
- **Gallery** (`/api/gallery`) — multi-image upload (`images` field, up to 20
  files/request) grouped into albums by `category`, with endpoints to add
  more images to an existing album or remove a single image.
- **News** (`/api/news`) — auto-slugged on create, `publishedAt` stamped the
  first time status flips to `published`, public detail lookup by slug.
- **Events** (`/api/events`) — date/venue/status, public listing sorted
  chronologically.
- **Carousel** (`/api/carousel`) — homepage hero slides with priority
  ordering and an optional CTA button/link.
- **Downloads** (`/api/downloads`) — PDF uploads to Cloudinary (`resource_type: raw`), grouped by category.
- **Settings** (`/api/settings`) — singleton document (site name, contact,
  social links, SEO, map embed); separate endpoints for logo/favicon upload
  since those go through Cloudinary while the rest is plain JSON.

## Next phase

Next up: the Next.js 15 frontend — public site (landing page, all the
sections above), the member dashboard (profile, card download, family
management), and the admin dashboard (analytics, all the CRUD screens).

## Security notes for production

- Set `COOKIE_SECURE=true` and `NODE_ENV=production` once deployed behind
  HTTPS (Railway/EC2) — this makes cookies `Secure` + `SameSite=None` so
  they work across the Vercel frontend domain.
- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — they must be strong,
  random, and different from each other.
- `CLIENT_URL` drives the CORS allow-list; set it to your exact Vercel
  production URL (comma-separate multiple origins if needed, e.g. preview +
  production).

# kmcc-backend
