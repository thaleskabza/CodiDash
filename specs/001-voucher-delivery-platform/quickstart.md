# Quickstart: Voucher Delivery Platform (Model 2)

**Feature**: 001-voucher-delivery-platform
**Date**: 2026-03-14

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Git
- A Supabase account (free tier: [supabase.com](https://supabase.com))
- A PayFast sandbox account (free: [sandbox.payfast.co.za](https://sandbox.payfast.co.za))

## 1. Clone and Install

```bash
git clone https://github.com/<org>/CodiDash.git
cd CodiDash
npm install
```

## 2. Environment Setup

Copy the environment template and fill in values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Auth (NextAuth)
NEXTAUTH_SECRET=[generate-with: openssl rand -base64 32]
NEXTAUTH_URL=http://localhost:3000

# PayFast (Sandbox)
PAYFAST_MERCHANT_ID=[sandbox-merchant-id]
PAYFAST_MERCHANT_KEY=[sandbox-merchant-key]
PAYFAST_PASSPHRASE=[sandbox-passphrase]
PAYFAST_SANDBOX=true

# QR Signing
QR_SECRET=[generate-with: openssl rand -base64 32]

# Geocoding
NOMINATIM_USER_AGENT=codidash-dev
```

## 3. Database Setup

### Using Prisma (recommended)

```bash
# Generate Prisma client
npx prisma generate

# Run migrations against Supabase
npx prisma migrate dev --name init

# Seed initial data (stores, menu items)
npx prisma db seed
```

### Seed Data

The seed script creates:
- 5 Kauai stores (Cape Town pilot)
- Sample menu items (smoothies)
- 1 admin user (admin@codidash.co.za / changeme)

## 4. Run Development Server

```bash
npm run dev
```

The app runs at `http://localhost:3000`:
- Customer portal: `http://localhost:3000/` (default)
- Driver portal: `http://localhost:3000/driver`
- Admin portal: `http://localhost:3000/admin`

## 5. Testing

```bash
# Unit tests
npm run test

# Integration tests (requires database)
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests
npm run test:all
```

## 6. Key Development Workflows

### Create a test order (manual)

1. Register a customer account at `/`
2. Register a driver account at `/driver`
3. Log in as admin at `/admin`, approve the driver
4. Log in as customer, create an order with a test voucher code
5. Log in as driver, accept the broadcast order
6. Follow the pickup → delivery → QR scan flow

### PayFast sandbox testing

- Use PayFast sandbox test card: `5200000000000015` (Mastercard)
- Expiry: any future date
- CVV: `123`
- ITN webhooks require a publicly accessible URL — use `ngrok` for local development:
  ```bash
  ngrok http 3000
  ```
  Set the ngrok URL as the ITN callback in PayFast sandbox settings.

## 7. Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Create/apply migration |

## 8. Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or via CLI:
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... (all variables from .env.local)
```

Vercel automatically detects Next.js and configures:
- Serverless functions for API routes
- Static generation for applicable pages
- Edge middleware for auth checks

## 9. Architecture Overview

```
Browser → Next.js App (Vercel)
              ├── Route Groups: (customer), (driver), (admin)
              ├── API Routes: /api/*
              ├── Middleware: auth + role checks
              └── Supabase Client
                    ├── PostgreSQL (data)
                    ├── Realtime (live updates)
                    └── Storage (images)

External:
  PayFast ←→ /api/payments/webhook (ITN)
  Nominatim → address geocoding
  Kauai POS → voucher redemption (driver, out-of-band)
```
