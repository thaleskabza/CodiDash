# Research: Voucher Delivery Platform (Model 2)

**Feature**: 001-voucher-delivery-platform
**Date**: 2026-03-14
**Status**: Complete

## 1. PayFast Pre-Authorization & Payment Flow

### Decision
Use PayFast's custom integration (server-side) with tokenization for pre-authorization. PayFast does not offer a native "hold and capture" (pre-auth) flow like Stripe. Instead, implement a two-step approach:

1. **At order creation**: Tokenize the customer's card via PayFast's tokenization API (ad-hoc tokenization or subscription tokenization endpoint). Store the token securely.
2. **At delivery (QR scan)**: Use the stored token to initiate a charge via PayFast's `adhoc` charge endpoint (`POST /eng/process` with `transaction_type=adhoc`).

### Rationale
- PayFast is the only viable free-tier payment gateway in South Africa meeting constitution constraints.
- Tokenization + deferred charge achieves the same functional outcome as pre-authorization without requiring a formal hold/capture API.
- The customer's card is validated at order creation (a R0 or R1 validation charge can confirm card validity), and the actual delivery fee (R35 or R45) is charged only upon QR scan.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| PayFast Standard (redirect) | No tokenization — customer would need to pay via redirect at delivery time, poor UX for QR-triggered flow |
| Yoco | Higher fees, no free tier, limited API for server-side tokenization |
| Stripe SA | Available in SA but higher per-transaction fees and monthly costs; violates "free tier for MVP" constraint |
| Manual bank transfer | Not scalable, poor UX, no real-time confirmation |

### Key Implementation Notes
- PayFast sandbox available at `https://sandbox.payfast.co.za`
- Merchant ID, Merchant Key, and Passphrase stored as environment variables
- ITN (Instant Transaction Notification) webhook for payment confirmation
- Signature validation on all ITN callbacks using MD5 hash of sorted parameters + passphrase
- Payment split logic is internal (platform accounting) — PayFast charges the full amount; the platform distributes internally

---

## 2. Real-Time Order Tracking & Notifications

### Decision
Use Supabase Realtime (built on PostgreSQL's logical replication) for real-time order status updates. No additional infrastructure needed.

### Rationale
- Supabase is already the chosen PostgreSQL provider (constitution constraint).
- Supabase Realtime provides WebSocket-based subscriptions on database changes out of the box.
- No need for a separate WebSocket server, Redis Pub/Sub, or polling infrastructure.
- Clients subscribe to changes on the `orders` table filtered by their `order_id` or `driver_id`.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| Socket.io + custom WebSocket server | Extra infrastructure, hosting cost, violates simplicity principle |
| Server-Sent Events (SSE) via Vercel | Vercel serverless functions have 10s timeout (hobby) / 60s (pro); not suitable for long-lived connections |
| Polling (client-side) | Higher latency (seconds vs milliseconds), wastes bandwidth, poor UX for real-time tracking |
| Pusher / Ably | Additional paid service, unnecessary when Supabase Realtime is already available |

### Key Implementation Notes
- Use `supabase.channel('orders').on('postgres_changes', ...)` in the client
- Filter by `order_id` for customer view, by `driver_id` for driver view
- Row-level security (RLS) ensures customers only see their own orders, drivers only see assigned orders
- Broadcast channel for driver order broadcasts (new orders in area)
- Supabase Realtime free tier: 200 concurrent connections (sufficient for MVP 50 orders/day)

---

## 3. QR Code Generation & Signing

### Decision
Use HMAC-SHA256 for QR code signing with the `qrcode` npm package for generation.

### Rationale
- HMAC-SHA256 provides tamper-proof verification without requiring asymmetric keys.
- The `qrcode` npm package is lightweight, well-maintained, and generates QR codes as data URLs or SVGs for the frontend.
- The QR payload is compact JSON, keeping scan reliability high.

### QR Payload Structure
```json
{
  "oid": "ORD-uuid",
  "ts": 1710403200,
  "sig": "hmac-sha256-hex-string"
}
```

### Signing Flow
1. Server generates payload: `{ oid, ts }` where `ts` is Unix timestamp.
2. Server computes `sig = HMAC-SHA256(JSON.stringify({ oid, ts }), QR_SECRET)`.
3. Full payload (with sig) is encoded as QR code and displayed to customer.
4. On scan, server re-computes HMAC from `{ oid, ts }` and compares to `sig`.
5. Server also validates `ts` is within the 2-hour validity window.

### Key Implementation Notes
- `QR_SECRET` stored as environment variable, never exposed to client
- QR code rendered client-side from the signed payload returned by the API
- Expiry check: `Date.now() / 1000 - ts < 7200` (2 hours)
- Use `crypto.createHmac('sha256', secret)` from Node.js built-in `crypto` module

---

## 4. Geolocation & Distance Calculation

### Decision
Use the Haversine formula via `@turf/distance` for server-side distance calculation. Use the browser Geolocation API for driver GPS verification.

### Rationale
- `@turf/distance` is a lightweight, well-tested geospatial library (part of Turf.js).
- Haversine formula is sufficient for short-distance calculations (< 50km) where Earth curvature distortion is negligible.
- No need for a full geocoding service or Google Maps API — OpenStreetMap + Nominatim for address-to-coordinates conversion is free.

### Distance Calculation Use Cases
1. **Delivery fee tier**: Calculate distance from store coordinates to delivery address coordinates → R35 (0–4km), R45 (5–10km), reject (>10km).
2. **Driver broadcast radius**: Calculate distance from store to driver's last known location → prioritize 2–3km tier, then expand to 3–4km.
3. **GPS verification at pickup**: Calculate distance from driver's reported GPS to store coordinates → must be within 200m.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| Google Maps Distance Matrix API | Paid API, violates free-tier constraint |
| Mapbox | Free tier limited, additional dependency |
| Manual lat/lng math | Error-prone, @turf/distance is trivial to use |
| PostGIS | Overkill for MVP distance calculations; adds DB extension complexity |

### Key Implementation Notes
- Store coordinates stored as `latitude DECIMAL(10,8)` and `longitude DECIMAL(11,8)` in the `stores` table
- Address geocoding via Nominatim (OpenStreetMap): `https://nominatim.openstreetmap.org/search?q={address}&format=json`
- Rate limit Nominatim requests (1 req/sec max per their usage policy)
- Cache geocoded addresses in the `delivery_addresses` table to avoid repeat lookups
- Driver location updates via browser Geolocation API (`navigator.geolocation.watchPosition`)

---

## 5. Project Structure (Next.js Monorepo)

### Decision
Use Next.js App Router with route groups for the three portals, deployed as a single Vercel project.

### Rationale
- A single Next.js application with route groups (`(customer)`, `(driver)`, `(admin)`) keeps deployment simple on Vercel's free tier.
- Shared components, utilities, and API routes avoid code duplication across portals.
- Route groups provide URL-level separation without requiring a monorepo tool (Turborepo, Nx).
- Constitution principle I (Simplicity) favors the simplest viable approach.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| Turborepo monorepo with 3 Next.js apps | Over-engineered for MVP; 3 separate Vercel deployments consume free-tier limits; complex CI |
| Separate repositories per portal | Maximum duplication, coordination overhead, violates simplicity |
| Single app with role-based routing (no route groups) | Works but route groups provide cleaner separation and layout isolation |

### Concrete Structure
```
src/
├── app/
│   ├── (customer)/          # Customer portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Landing / order creation
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── page.tsx # Order tracking + QR display
│   │   └── profile/
│   │       └── page.tsx     # Address management
│   ├── (driver)/            # Driver portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Dashboard / available orders
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── page.tsx # Active order / pickup / scan
│   │   └── profile/
│   │       └── page.tsx     # Driver profile
│   ├── (admin)/             # Admin portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Dashboard overview
│   │   ├── orders/
│   │   │   └── page.tsx     # Order monitoring
│   │   ├── drivers/
│   │   │   └── page.tsx     # Driver management
│   │   └── revenue/
│   │       └── page.tsx     # Revenue tracking
│   ├── api/                 # API routes (Vercel serverless functions)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── orders/
│   │   │   ├── route.ts     # POST create, GET list
│   │   │   └── [id]/
│   │   │       ├── route.ts # GET, PATCH status
│   │   │       ├── qr/
│   │   │       │   └── route.ts
│   │   │       └── items/
│   │   │           └── route.ts
│   │   ├── drivers/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts # PayFast ITN
│   │   ├── stores/
│   │   │   └── route.ts
│   │   └── dispatch/
│   │       └── route.ts     # Broadcast logic
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Shared UI components
│   ├── customer/            # Customer-specific components
│   ├── driver/              # Driver-specific components
│   └── admin/               # Admin-specific components
├── lib/
│   ├── db.ts                # Supabase client
│   ├── auth.ts              # NextAuth config
│   ├── payfast.ts           # PayFast integration
│   ├── qr.ts                # QR generation + verification
│   ├── geo.ts               # Distance calculations
│   └── utils.ts             # Shared utilities
├── types/
│   └── index.ts             # TypeScript types
└── middleware.ts            # Auth + role-based route protection

tests/
├── unit/
│   ├── lib/
│   └── components/
├── integration/
│   └── api/
└── e2e/
    ├── customer/
    ├── driver/
    └── admin/

prisma/                      # OR supabase/migrations/
└── schema.prisma            # Database schema (if using Prisma)

public/
└── ...                      # Static assets
```

### Key Implementation Notes
- Middleware (`middleware.ts`) handles role-based route protection: customer routes require `role=customer`, driver routes require `role=driver`, admin routes require `role=admin`
- Shared `lib/` directory contains all service logic (PayFast, QR, geo, DB)
- API routes in `src/app/api/` serve as the backend — no separate Express server needed
- Prisma ORM recommended over raw SQL for type safety and migrations (compatible with Supabase PostgreSQL)

---

## 6. Authentication (NextAuth.js)

### Decision
Use NextAuth.js (Auth.js v5) with credentials provider for email/password authentication.

### Rationale
- NextAuth is the constitutionally mandated auth framework.
- Credentials provider supports email/password without requiring OAuth providers (appropriate for MVP where social login is not a requirement).
- JWT-based sessions work well with Vercel serverless (no server-side session store needed).
- Role-based access is implemented via the JWT payload (`role` field).

### Key Implementation Notes
- Passwords hashed with `bcrypt` (minimum 10 salt rounds)
- JWT session strategy (not database sessions) to avoid session table overhead
- Custom `authorize` callback validates credentials against the `users` table
- `session` and `jwt` callbacks inject `role` and `userId` into the token/session
- Protected API routes verify session + role via `getServerSession`

---

## 7. Database: Supabase PostgreSQL

### Decision
Use Supabase as the PostgreSQL provider with Prisma ORM for schema management and queries.

### Rationale
- Supabase is constitutionally mandated.
- Prisma provides type-safe queries, automatic migrations, and schema introspection.
- Supabase's Row Level Security (RLS) adds an additional security layer.
- Supabase Realtime (research item #2) is available out of the box.

### Key Implementation Notes
- Connection string via `DATABASE_URL` environment variable (Supabase connection pooler)
- Use Prisma Migrate for schema evolution (`npx prisma migrate dev`)
- Enable RLS on sensitive tables (`orders`, `payments`) as a defense-in-depth measure
- Supabase free tier: 500MB storage, 2 GB bandwidth, 50k monthly active users (sufficient for MVP)

---

## 8. Notification System (MVP)

### Decision
Use in-app notifications via Supabase Realtime. No email/SMS/push for MVP.

### Rationale
- Simplicity principle: in-app notifications require no additional services.
- Both customer and driver portals are web-based — real-time database subscriptions deliver instant notifications.
- Email/SMS can be added post-MVP via services like Resend (email) or Twilio (SMS).

### Key Implementation Notes
- Notification events: order status changes, driver assignment, invalid voucher alerts, payment confirmation
- Notifications derived from `orders` table status changes — no separate notifications table needed for MVP
- Driver broadcast notifications use Supabase Realtime broadcast channels
