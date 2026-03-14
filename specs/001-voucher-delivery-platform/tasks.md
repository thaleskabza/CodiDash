# Tasks: Voucher Delivery Platform (Model 2)

**Input**: Design documents from `/specs/001-voucher-delivery-platform/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per constitution principle VI (Test-First Quality). Tests are written before implementation within each story phase.

**Organization**: Tasks grouped by user story. Implementation order adjusted for dependencies: auth stories (US4, US5) precede core order flow (US1, US2) despite lower business priority.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic configuration

- [ ] T001 Initialize Next.js 14 project with TypeScript and App Router in repository root (`npx create-next-app@14 . --typescript --app --src-dir`)
- [ ] T002 Install core dependencies: `@supabase/supabase-js`, `prisma`, `@prisma/client`, `next-auth@beta`, `bcrypt`, `qrcode`, `@turf/distance`, `@turf/helpers`, `zod`
- [ ] T003 Install dev dependencies: `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `playwright`, `@types/bcrypt`, `@types/qrcode`, `supertest`, `ts-jest`
- [ ] T004 [P] Create `.env.example` with all required environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, SUPABASE keys, PAYFAST credentials, QR_SECRET, NOMINATIM_USER_AGENT)
- [ ] T005 [P] Configure ESLint and Prettier with Next.js recommended rules in `eslint.config.mjs` and `.prettierrc`
- [ ] T006 [P] Configure Jest for unit/integration tests in `jest.config.ts` with path aliases and TypeScript support
- [ ] T007 [P] Configure Playwright for E2E tests in `playwright.config.ts` with base URL and project definitions for customer/driver/admin portals
- [ ] T008 [P] Create GitHub Actions CI workflow in `.github/workflows/ci.yml` (lint, test, build on PR)
- [ ] T009 Create root layout with providers in `src/app/layout.tsx` and global styles in `src/app/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth framework, shared libraries, and middleware that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create Prisma schema with all entities (User, Driver, Store, DeliveryAddress, Order, OrderItem, Payment, OrderAudit, MenuItem) including enums, relations, and indexes in `prisma/schema.prisma`
- [ ] T011 Run initial Prisma migration and generate client (`npx prisma migrate dev --name init`)
- [ ] T012 Create seed script with 5 Cape Town Kauai stores, sample menu items, and 1 admin user in `prisma/seed.ts`
- [ ] T013 [P] Create Supabase client singleton in `src/lib/db.ts` (server-side service role client + browser anon client)
- [ ] T014 [P] Create Prisma client singleton with connection pooling in `src/lib/prisma.ts`
- [ ] T015 Configure NextAuth.js v5 with credentials provider, JWT strategy, bcrypt password verification, and role injection in session/JWT callbacks in `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`
- [ ] T016 Implement auth + role-based route protection middleware in `src/middleware.ts` (customer routes require role=customer, driver routes require role=driver, admin routes require role=admin)
- [ ] T017 [P] Implement geo distance utility using @turf/distance (calculateDistance, getDeliveryTier, findNearestStore) in `src/lib/geo.ts`
- [ ] T018 [P] Implement QR code generation and HMAC-SHA256 signing/verification (generateQR, signPayload, verifySignature) in `src/lib/qr.ts`
- [ ] T019 [P] Implement PayFast integration utilities (createToken, chargeToken, verifyITN, validateSignature) in `src/lib/payfast.ts`
- [ ] T020 [P] Create shared TypeScript types and Zod validation schemas for all entities in `src/types/index.ts`
- [ ] T021 [P] Create shared error handling utilities (AppError class, error response formatter) in `src/lib/errors.ts`
- [ ] T022 [P] Create shared UI components (Button, Input, Card, Alert, Loading) in `src/components/ui/`
- [ ] T023 [P] Implement file upload utility for Supabase Storage (voucher images, receipt photos) in `src/lib/uploads.ts`
- [ ] T024 Create file upload API route (`POST /api/uploads`) with size/type validation in `src/app/api/uploads/route.ts`
- [ ] T025 Write unit tests for geo utility (distance calc, tier determination, edge cases) in `tests/unit/lib/geo.test.ts`
- [ ] T026 [P] Write unit tests for QR utility (sign, verify, expiry, tamper detection) in `tests/unit/lib/qr.test.ts`
- [ ] T027 [P] Write unit tests for PayFast utility (signature validation, ITN verification) in `tests/unit/lib/payfast.test.ts`

**Checkpoint**: Foundation ready — all shared infrastructure in place. User story implementation can now begin.

---

## Phase 3: User Story 4 — Customer Registration & Account Management (Priority: P4)

**Goal**: Customers can register, log in, save delivery addresses, and manage their profile

**Independent Test**: Register a new customer, log in, save a delivery address, log out, log back in, verify address persists

**Why implemented first**: Authentication and account management are prerequisites for US1 (placing orders)

### Tests for User Story 4

- [ ] T028 [P] [US4] Write integration test for customer registration endpoint (valid, duplicate email, invalid input) in `tests/integration/api/auth-register.test.ts`
- [ ] T029 [P] [US4] Write integration test for customer login endpoint (valid credentials, invalid password, unknown email) in `tests/integration/api/auth-login.test.ts`
- [ ] T030 [P] [US4] Write integration test for delivery address CRUD in `tests/integration/api/addresses.test.ts`

### Implementation for User Story 4

- [ ] T031 [US4] Create customer registration API route (`POST /api/auth/register`) with email uniqueness check, password hashing (bcrypt), and role assignment in `src/app/api/auth/register/route.ts`
- [ ] T032 [US4] Create delivery address API routes (`GET/POST /api/addresses`, `PATCH/DELETE /api/addresses/[id]`) with geocoding via Nominatim in `src/app/api/addresses/route.ts` and `src/app/api/addresses/[id]/route.ts`
- [ ] T033 [P] [US4] Create customer registration page with name/email/password form and validation in `src/app/(customer)/register/page.tsx`
- [ ] T034 [P] [US4] Create customer login page with email/password form in `src/app/(customer)/login/page.tsx`
- [ ] T035 [US4] Create customer profile page with delivery address management (add, edit, delete, set default) in `src/app/(customer)/profile/page.tsx`
- [ ] T036 [US4] Create AddressForm component with address input and geocoding feedback in `src/components/customer/AddressForm.tsx`

**Checkpoint**: Customers can register, log in, and manage delivery addresses.

---

## Phase 4: User Story 5 — Driver Registration & Onboarding (Priority: P5)

**Goal**: Drivers can register, await admin approval, and access their dashboard upon approval

**Independent Test**: Register a driver with vehicle details, verify pending_approval status, simulate admin approval, log in as driver, see empty dashboard

**Why implemented second**: Driver accounts are prerequisites for US2 (fulfilling orders)

### Tests for User Story 5

- [ ] T037 [P] [US5] Write integration test for driver registration endpoint (valid, missing vehicle_type) in `tests/integration/api/driver-register.test.ts`
- [ ] T038 [P] [US5] Write integration test for driver status transitions (pending → available, pending → suspended) in `tests/integration/api/driver-status.test.ts`

### Implementation for User Story 5

- [ ] T039 [US5] Create driver registration API route (`POST /api/auth/register/driver`) creating User (role=driver) + Driver record in `src/app/api/auth/register/driver/route.ts`
- [ ] T040 [US5] Create driver profile/status API routes (`GET /api/drivers/me`, `PUT /api/drivers/me/location`) in `src/app/api/drivers/me/route.ts` and `src/app/api/drivers/me/location/route.ts`
- [ ] T041 [P] [US5] Create driver registration page with personal details and vehicle type form in `src/app/(driver)/register/page.tsx`
- [ ] T042 [P] [US5] Create driver login page in `src/app/(driver)/login/page.tsx`
- [ ] T043 [US5] Create driver dashboard page with availability toggle and pending approval state in `src/app/(driver)/page.tsx`
- [ ] T044 [US5] Create driver profile page showing status, rating, and vehicle info in `src/app/(driver)/profile/page.tsx`

**Checkpoint**: Drivers can register and log in. Admin approval flow available (admin endpoint created in US3).

---

## Phase 5: User Story 1 — Customer Places a Voucher Delivery Order (Priority: P1) MVP

**Goal**: Customer can create an order with vouchers + smoothie items, see delivery fee, receive QR code, and track order status in real time

**Independent Test**: Log in as customer, upload voucher(s), select smoothie(s), enter address, verify fee calculation (R35/R45), submit order, see QR code and tracking view with live status updates

### Tests for User Story 1

- [ ] T045 [P] [US1] Write integration test for order creation endpoint (valid single item, valid multi-item, voucher-item mismatch, address out of range) in `tests/integration/api/orders-create.test.ts`
- [ ] T046 [P] [US1] Write integration test for QR code generation endpoint (valid order, expired QR, invalid signature) in `tests/integration/api/orders-qr.test.ts`
- [ ] T047 [P] [US1] Write unit test for delivery fee calculation (0-4km=R35, 5-10km=R45, >10km=reject) in `tests/unit/lib/delivery-fee.test.ts`

### Implementation for User Story 1

- [ ] T048 [US1] Create stores API route (`GET /api/stores`) returning active stores with coordinates in `src/app/api/stores/route.ts`
- [ ] T049 [US1] Create menu items API route (`GET /api/menu`) returning available smoothie items in `src/app/api/menu/route.ts`
- [ ] T050 [US1] Create order creation API route (`POST /api/orders`) with voucher-item 1:1 validation, distance calculation, fee determination, PayFast tokenization, QR generation, and OrderItem creation in `src/app/api/orders/route.ts`
- [ ] T051 [US1] Create order detail API route (`GET /api/orders/[id]`) with items, payment status, and QR data in `src/app/api/orders/[id]/route.ts`
- [ ] T052 [US1] Create order list API route (`GET /api/orders`) with status filtering and pagination (customer sees own orders) in `src/app/api/orders/route.ts` (GET handler)
- [ ] T053 [US1] Create QR code generation/regeneration API route (`GET /api/orders/[id]/qr`) in `src/app/api/orders/[id]/qr/route.ts`
- [ ] T054 [P] [US1] Create VoucherItemForm component (add/remove voucher-item pairs, 1:1 validation, image upload) in `src/components/customer/VoucherItemForm.tsx`
- [ ] T055 [P] [US1] Create StoreSelector component (list active stores, show on map) in `src/components/customer/StoreSelector.tsx`
- [ ] T056 [P] [US1] Create DeliveryFeeDisplay component (distance tier, fee amount, address validation feedback) in `src/components/customer/DeliveryFeeDisplay.tsx`
- [ ] T057 [P] [US1] Create QRCodeDisplay component (render QR image, expiry countdown, regenerate button) in `src/components/customer/QRCodeDisplay.tsx`
- [ ] T058 [US1] Create order creation page combining store selection, voucher-item form, address selection, fee display, and payment submission in `src/app/(customer)/page.tsx`
- [ ] T059 [US1] Create order tracking page with real-time status updates via Supabase Realtime subscription and QR code display in `src/app/(customer)/orders/[id]/page.tsx`
- [ ] T060 [US1] Create customer order history page with status filtering in `src/app/(customer)/orders/page.tsx`
- [ ] T061 [US1] Set up Supabase Realtime subscription hook for order status changes in `src/lib/realtime.ts`

**Checkpoint**: Customer can place orders with vouchers, see tiered delivery fees, view QR codes, and track order status in real time. This is the MVP.

---

## Phase 6: User Story 2 — Driver Accepts and Fulfills an Order (Priority: P2)

**Goal**: Drivers receive order broadcasts, accept orders, confirm pickup with receipt photo + GPS, scan delivery QR, and handle invalid voucher replacement flow

**Independent Test**: Log in as driver, receive broadcast order, accept it, upload receipt + confirm pickup (GPS verified), scan customer QR code, see payment confirmation

### Tests for User Story 2

- [ ] T062 [P] [US2] Write integration test for order accept endpoint (first claim wins, already claimed conflict, driver not available) in `tests/integration/api/orders-accept.test.ts`
- [ ] T063 [P] [US2] Write integration test for pickup confirmation endpoint (valid GPS + receipt, GPS mismatch rejection) in `tests/integration/api/orders-pickup.test.ts`
- [ ] T064 [P] [US2] Write integration test for QR scan/delivery endpoint (valid scan, expired QR, invalid signature) in `tests/integration/api/orders-deliver.test.ts`
- [ ] T065 [P] [US2] Write integration test for voucher invalid/replacement flow (report invalid, replace within 5 min, countdown expiry) in `tests/integration/api/voucher-replacement.test.ts`

### Implementation for User Story 2

- [ ] T066 [US2] Create dispatch broadcast API route (`POST /api/dispatch/broadcast`) implementing tiered radius logic (2-3km ideal, expand to 3-4km) in `src/app/api/dispatch/route.ts`
- [ ] T067 [US2] Create order accept API route (`POST /api/orders/[id]/accept`) with atomic claim (first-come-first-served) and driver status update in `src/app/api/orders/[id]/accept/route.ts`
- [ ] T068 [US2] Create order status update API route (`PATCH /api/orders/[id]`) with pickup confirmation (receipt photo + GPS verification within 200m) and in_transit transition in `src/app/api/orders/[id]/route.ts` (PATCH handler)
- [ ] T069 [US2] Create QR scan/delivery API route (`POST /api/orders/[id]/qr/scan`) verifying HMAC signature, checking expiry, triggering PayFast charge, applying payment split, and updating order to delivered in `src/app/api/orders/[id]/qr/scan/route.ts`
- [ ] T070 [US2] Create order cancel API route (`POST /api/orders/[id]/cancel`) handling driver voluntary cancellation (increment cancellation_count, re-broadcast) and customer cancellation in `src/app/api/orders/[id]/cancel/route.ts`
- [ ] T071 [US2] Create voucher status update API route (`PATCH /api/orders/[id]/items/[itemId]/voucher-status`) for driver to report invalid voucher, triggering 5-min countdown in `src/app/api/orders/[id]/items/[itemId]/voucher-status/route.ts`
- [ ] T072 [US2] Create voucher replacement API route (`PUT /api/orders/[id]/items/[itemId]/replace-voucher`) for customer to submit replacement within deadline in `src/app/api/orders/[id]/items/[itemId]/replace-voucher/route.ts`
- [ ] T073 [US2] Implement voucher replacement countdown expiry handler (scheduled check or Supabase database function) that cancels unreplaced items and charges cancellation fee in `src/lib/voucher-expiry.ts`
- [ ] T074 [P] [US2] Create DriverOrderCard component (order details, store info, voucher codes, accept button) in `src/components/driver/DriverOrderCard.tsx`
- [ ] T075 [P] [US2] Create PickupConfirmation component (receipt photo upload, GPS status indicator, confirm button) in `src/components/driver/PickupConfirmation.tsx`
- [ ] T076 [P] [US2] Create QRScanner component (camera access, QR decode, scan submission) in `src/components/driver/QRScanner.tsx`
- [ ] T077 [P] [US2] Create VoucherInvalidReport component (mark voucher invalid, see replacement countdown) in `src/components/driver/VoucherInvalidReport.tsx`
- [ ] T078 [US2] Create driver available orders page with Supabase Realtime broadcast subscription for nearby orders in `src/app/(driver)/page.tsx` (update from US5)
- [ ] T079 [US2] Create driver active order page with pickup confirmation, navigation link, QR scanner, and voucher status management in `src/app/(driver)/orders/[id]/page.tsx`
- [ ] T080 [US2] Set up Supabase Realtime broadcast channel for driver order notifications in `src/lib/realtime.ts` (extend from US1)
- [ ] T081 [US2] Set up Supabase Realtime channel for voucher replacement events (invalid, replaced, expired) in `src/lib/realtime.ts` (extend)
- [ ] T082 [US2] Create customer-side voucher replacement UI (notification, countdown timer, replacement form) in `src/components/customer/VoucherReplacement.tsx`

**Checkpoint**: Full driver workflow operational — broadcast, accept, pickup with GPS/receipt, QR scan delivery, invalid voucher handling. Combined with US1, the core order-to-delivery flow is complete.

---

## Phase 7: User Story 6 — Delivery Fee Payment Processing (Priority: P6)

**Goal**: PayFast integration for pre-auth at order creation and charge at delivery, with payment split and driver payouts

**Independent Test**: Simulate QR scan for both distance tiers, verify correct fee charged (R35/R45), confirm split applied (driver/platform portions), verify driver wallet balance updates

### Tests for User Story 6

- [ ] T083 [P] [US6] Write integration test for PayFast tokenization at order creation (sandbox card, token stored) in `tests/integration/api/payment-tokenize.test.ts`
- [ ] T084 [P] [US6] Write integration test for PayFast charge at delivery (R35 tier, R45 tier, charge failure + retry) in `tests/integration/api/payment-charge.test.ts`
- [ ] T085 [P] [US6] Write integration test for PayFast ITN webhook (valid signature, invalid signature, amount mismatch) in `tests/integration/api/payment-webhook.test.ts`

### Implementation for User Story 6

- [ ] T086 [US6] Create PayFast ITN webhook route (`POST /api/payments/webhook`) with IP whitelist, signature validation, payment status update, and audit logging in `src/app/api/payments/webhook/route.ts`
- [ ] T087 [US6] Implement payment charge flow in order delivery handler — call PayFast adhoc charge with stored token, apply split (driver_amount + platform_amount), create Payment record in `src/lib/payfast.ts` (extend charge logic)
- [ ] T088 [US6] Implement payment failure handling with retry capability — update order to payment_pending on failure, notify customer/driver, allow manual retry in `src/app/api/payments/retry/route.ts`
- [ ] T089 [US6] Create driver earnings page showing accumulated balance, completed deliveries, and payout history in `src/app/(driver)/earnings/page.tsx`
- [ ] T090 [US6] Create PaymentStatus component showing charge status, amount, and split breakdown in `src/components/shared/PaymentStatus.tsx`

**Checkpoint**: End-to-end payment flow operational — tokenize at order, charge at delivery, split applied, driver earnings tracked.

---

## Phase 8: User Story 3 — Admin Monitors Platform Operations (Priority: P3)

**Goal**: Admin dashboard with order monitoring, driver management, revenue tracking, and fraud detection

**Independent Test**: Log in as admin, view orders filtered by status, view driver list with approval controls, see revenue summary, see fraud-flagged orders

### Tests for User Story 3

- [ ] T091 [P] [US3] Write integration test for admin order listing endpoint (filter by status, date range, pagination) in `tests/integration/api/admin-orders.test.ts`
- [ ] T092 [P] [US3] Write integration test for admin driver management endpoint (approve, suspend, list with status filter) in `tests/integration/api/admin-drivers.test.ts`
- [ ] T093 [P] [US3] Write integration test for revenue tracking endpoint (date range, totals, splits) in `tests/integration/api/admin-revenue.test.ts`

### Implementation for User Story 3

- [ ] T094 [US3] Create admin order listing API route (`GET /api/admin/orders`) with status/date/store/driver filtering and pagination in `src/app/api/admin/orders/route.ts`
- [ ] T095 [US3] Create admin driver management API routes (`GET /api/admin/drivers`, `PATCH /api/admin/drivers/[id]`) for listing, approving, suspending in `src/app/api/admin/drivers/route.ts` and `src/app/api/admin/drivers/[id]/route.ts`
- [ ] T096 [US3] Create admin revenue tracking API route (`GET /api/admin/revenue`) with date range aggregation (total, driver payouts, platform earnings, order counts) in `src/app/api/admin/revenue/route.ts`
- [ ] T097 [US3] Create admin fraud detection API route (`GET /api/admin/fraud`) returning orders flagged for missing receipts, GPS mismatches, expired QR anomalies in `src/app/api/admin/fraud/route.ts`
- [ ] T098 [P] [US3] Create OrderTable component with sortable columns, status badges, and row click for details in `src/components/admin/OrderTable.tsx`
- [ ] T099 [P] [US3] Create DriverTable component with status badges, approve/suspend actions, and cancellation count display in `src/components/admin/DriverTable.tsx`
- [ ] T100 [P] [US3] Create RevenueChart component with date range selector and summary cards (total, driver payouts, platform earnings) in `src/components/admin/RevenueChart.tsx`
- [ ] T101 [P] [US3] Create FraudAlerts component showing flagged orders with anomaly type indicators in `src/components/admin/FraudAlerts.tsx`
- [ ] T102 [US3] Create admin dashboard page with overview cards (active orders, online drivers, today's revenue, fraud alerts count) in `src/app/(admin)/page.tsx`
- [ ] T103 [US3] Create admin order monitoring page with OrderTable and status filters in `src/app/(admin)/orders/page.tsx`
- [ ] T104 [US3] Create admin driver management page with DriverTable and approval workflow in `src/app/(admin)/drivers/page.tsx`
- [ ] T105 [US3] Create admin revenue tracking page with RevenueChart and date range filters in `src/app/(admin)/revenue/page.tsx`
- [ ] T106 [US3] Create admin fraud detection page with FraudAlerts listing in `src/app/(admin)/fraud/page.tsx`
- [ ] T107 [US3] Create admin layout with sidebar navigation (Dashboard, Orders, Drivers, Revenue, Fraud) in `src/app/(admin)/layout.tsx`

**Checkpoint**: Admin portal fully operational — orders, drivers, revenue, and fraud monitoring all accessible.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories, hardening, and deployment readiness

- [ ] T108 Implement automatic order cancellation after 30-minute driver timeout (configurable) via scheduled function or Supabase cron in `src/lib/order-timeout.ts`
- [ ] T109 Implement automatic order reassignment after 90-minute pickup timeout in `src/lib/order-timeout.ts` (extend)
- [ ] T110 [P] Add OrderAudit trail logging to all order status change handlers (create audit record with actor, previous/new status, metadata) in `src/lib/audit.ts`
- [ ] T111 [P] Add Sentry error tracking integration in `src/lib/sentry.ts` and `next.config.js`
- [ ] T112 [P] Create customer layout with navigation (Home, Orders, Profile) in `src/app/(customer)/layout.tsx`
- [ ] T113 [P] Create driver layout with mobile-optimised navigation (Dashboard, Active Order, Earnings, Profile) in `src/app/(driver)/layout.tsx`
- [ ] T114 Configure Vercel deployment settings in `vercel.json` (environment variables, build config)
- [ ] T115 Write E2E test for complete customer order flow (register → login → create order → view tracking → QR display) in `tests/e2e/customer/order-flow.spec.ts`
- [ ] T116 [P] Write E2E test for complete driver fulfillment flow (register → login → accept → pickup → deliver) in `tests/e2e/driver/fulfillment-flow.spec.ts`
- [ ] T117 [P] Write E2E test for admin monitoring flow (login → view orders → approve driver → view revenue) in `tests/e2e/admin/monitoring-flow.spec.ts`
- [ ] T118 Run quickstart.md validation — verify all setup steps work on a clean clone
- [ ] T119 Security review: verify no secrets in code, all env vars documented, RBAC enforced on all routes, HMAC secrets rotatable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US4 (Phase 3)**: Depends on Phase 2 — BLOCKS US1 (customers need accounts to place orders)
- **US5 (Phase 4)**: Depends on Phase 2 — BLOCKS US2 (drivers need accounts to accept orders). Can run in parallel with US4.
- **US1 (Phase 5)**: Depends on Phase 3 (US4) — customer accounts must exist. MVP milestone.
- **US2 (Phase 6)**: Depends on Phase 4 (US5) and Phase 5 (US1) — needs driver accounts and existing orders
- **US6 (Phase 7)**: Depends on Phase 6 (US2) — payment charge triggered by delivery QR scan
- **US3 (Phase 8)**: Depends on Phase 2 only — can start after Foundational. Benefits from US1/US2/US6 data but is independently testable with seed data.
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (US4)     Phase 4 (US5)     Phase 8 (US3) ← can start here
    │                  │
    ▼                  │
Phase 5 (US1) ◄───────┘
    │         MVP
    ▼
Phase 6 (US2)
    │
    ▼
Phase 7 (US6)
    │
    ▼
Phase 9 (Polish)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/schema before services
- API routes before frontend pages
- Shared components before pages that consume them
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T004–T008 can all run in parallel
- **Phase 2**: T013/T014, T017–T023, T025–T027 can run in parallel after T010–T012
- **Phase 3 + Phase 4**: US4 and US5 can run in parallel (different portals, no shared code beyond foundation)
- **Phase 5**: T054–T057 (components) can run in parallel; T045–T047 (tests) can run in parallel
- **Phase 6**: T074–T077 (components) can run in parallel; T062–T065 (tests) can run in parallel
- **Phase 8**: T098–T101 (admin components) can run in parallel; T091–T093 (tests) can run in parallel
- **Phase 8 (US3)** can run in parallel with Phases 5–7 if staffed separately

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: "Integration test for order creation in tests/integration/api/orders-create.test.ts"
Task: "Integration test for QR generation in tests/integration/api/orders-qr.test.ts"
Task: "Unit test for delivery fee in tests/unit/lib/delivery-fee.test.ts"

# Launch all customer components together:
Task: "VoucherItemForm component in src/components/customer/VoucherItemForm.tsx"
Task: "StoreSelector component in src/components/customer/StoreSelector.tsx"
Task: "DeliveryFeeDisplay component in src/components/customer/DeliveryFeeDisplay.tsx"
Task: "QRCodeDisplay component in src/components/customer/QRCodeDisplay.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch all tests for US2 together:
Task: "Integration test for order accept in tests/integration/api/orders-accept.test.ts"
Task: "Integration test for pickup confirm in tests/integration/api/orders-pickup.test.ts"
Task: "Integration test for QR scan/delivery in tests/integration/api/orders-deliver.test.ts"
Task: "Integration test for voucher replacement in tests/integration/api/voucher-replacement.test.ts"

# Launch all driver components together:
Task: "DriverOrderCard in src/components/driver/DriverOrderCard.tsx"
Task: "PickupConfirmation in src/components/driver/PickupConfirmation.tsx"
Task: "QRScanner in src/components/driver/QRScanner.tsx"
Task: "VoucherInvalidReport in src/components/driver/VoucherInvalidReport.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US4 (Customer Registration)
4. Complete Phase 5: US1 (Customer Places Order)
5. **STOP and VALIDATE**: Test US1 independently — customer can register, place order, see QR + tracking
6. Deploy to Vercel for demo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US4 (Customer Auth) + US1 (Order Placement) → **MVP Demo** (customer-side complete)
3. US5 (Driver Auth) + US2 (Driver Fulfillment) → **Full order-to-delivery flow**
4. US6 (Payment Processing) → **Revenue generation enabled**
5. US3 (Admin Monitoring) → **Operational visibility**
6. Polish → **Production ready**

### Parallel Team Strategy

With multiple developers after Foundational phase:

- **Developer A**: US4 → US1 → US6 (customer + payment path)
- **Developer B**: US5 → US2 (driver path)
- **Developer C**: US3 (admin path — can start immediately after Foundational)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after its dependencies
- Tests are included per constitution principle VI (Test-First Quality)
- Commit after each task or logical group using conventional commits (`feat(order): add order creation API`)
- Stop at any checkpoint to validate story independently
- All amounts stored in cents (3500 = R35.00) to avoid floating-point issues
- PayFast sandbox used for all development/testing — switch to production via environment variables only
