# Implementation Plan: Voucher Delivery Platform (Model 2)

**Branch**: `001-voucher-delivery-platform` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-voucher-delivery-platform/spec.md`

## Summary

Build an open-source voucher delivery logistics platform that enables customers with Discovery Vitality Kauai vouchers to order smoothie deliveries. The platform handles logistics (order placement, driver dispatch, delivery tracking) and delivery payment (distance-tiered fees via PayFast), while voucher redemption remains external (Driver → Kauai POS → WiCode). Implemented as a single Next.js application with route groups for three portals (customer, driver, admin), backed by Supabase PostgreSQL with Realtime for live updates, and PayFast tokenization for deferred payment capture.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+ LTS
**Primary Dependencies**: Next.js 14 (App Router), React 18, NextAuth.js v5, Prisma ORM, Supabase Client, @turf/distance, qrcode, bcrypt
**Storage**: PostgreSQL via Supabase (free tier — 500MB storage, 2GB bandwidth)
**Testing**: Jest (unit), Playwright (E2E), Supertest (integration)
**Target Platform**: Web (Vercel serverless), mobile-optimised responsive design for driver portal
**Project Type**: Web application (full-stack Next.js)
**Performance Goals**: 50 concurrent orders, order status updates visible within 5 seconds, QR scan → payment < 3 seconds
**Constraints**: All services must have a free tier for MVP; South African Rand (ZAR) only; single-city deployment (Cape Town); no native mobile apps
**Scale/Scope**: 50 orders/day, 5 stores, 10 drivers, 3 portals (~15 screens total)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity | PASS | Single Next.js app with route groups; no monorepo tooling; Prisma for DB access; no speculative abstractions |
| II. Transparency & Open Source | PASS | MIT License; all code on GitHub; plan/spec/contracts documented publicly |
| III. Scalability by Design | PASS | Services logically separated (auth, order, dispatch, payment, QR) via API route modules; DB indexed; Supabase Realtime for pub/sub |
| IV. Compliance & Security | PASS | NextAuth (mandated); bcrypt passwords; HMAC-SHA256 QR signatures; PayFast tokenization; env vars for secrets; HTTPS enforced by Vercel |
| V. Community-Driven | PASS | PR reviews enforced; conventional commits; documentation included in plan |
| VI. Test-First Quality | PASS | Jest + Playwright + Supertest; PayFast/WiCode mocked; CI via GitHub Actions |
| VII. Modular Architecture | PASS | Route groups isolate portals; lib/ modules isolate service logic; API routes respect service boundaries; voucher redemption remains external |

**Post-Phase 1 Re-check**: All gates still PASS. No new dependencies or patterns introduced that violate constitution constraints.

## Project Structure

### Documentation (this feature)

```text
specs/001-voucher-delivery-platform/
├── plan.md              # This file
├── spec.md              # Feature specification (32 FRs, 6 user stories)
├── research.md          # Phase 0: technology research & decisions
├── data-model.md        # Phase 1: entity definitions & relationships
├── quickstart.md        # Phase 1: developer setup guide
├── contracts/           # Phase 1: API & realtime event contracts
│   ├── api-endpoints.md
│   └── realtime-events.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (customer)/              # Customer portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing / order creation
│   │   ├── orders/
│   │   │   └── [id]/page.tsx    # Order tracking + QR display
│   │   └── profile/page.tsx     # Address management
│   ├── (driver)/                # Driver portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Dashboard / available orders
│   │   ├── orders/
│   │   │   └── [id]/page.tsx    # Active order / pickup / scan
│   │   └── profile/page.tsx     # Driver profile
│   ├── (admin)/                 # Admin portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── orders/page.tsx      # Order monitoring
│   │   ├── drivers/page.tsx     # Driver management
│   │   └── revenue/page.tsx     # Revenue tracking
│   ├── api/                     # API routes (serverless functions)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── orders/
│   │   ├── drivers/
│   │   ├── payments/
│   │   ├── stores/
│   │   ├── dispatch/
│   │   └── uploads/
│   └── layout.tsx               # Root layout
├── components/
│   ├── ui/                      # Shared UI components
│   ├── customer/
│   ├── driver/
│   └── admin/
├── lib/
│   ├── db.ts                    # Supabase / Prisma client
│   ├── auth.ts                  # NextAuth configuration
│   ├── payfast.ts               # PayFast integration
│   ├── qr.ts                    # QR generation + HMAC verification
│   ├── geo.ts                   # Distance calculations (@turf/distance)
│   └── utils.ts                 # Shared utilities
├── types/
│   └── index.ts
└── middleware.ts                # Auth + role-based route protection

prisma/
├── schema.prisma                # Database schema
└── seed.ts                      # Seed data (stores, menu items, admin)

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
```

**Structure Decision**: Single Next.js application with App Router route groups. This is the simplest structure that satisfies the three-portal requirement while sharing components, lib modules, and API routes. No monorepo tooling needed. All portals deploy as a single Vercel project within the free tier.

## Complexity Tracking

> No constitution violations detected. No complexity justifications needed.
