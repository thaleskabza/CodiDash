# Data Model: Voucher Delivery Platform (Model 2)

**Feature**: 001-voucher-delivery-platform
**Date**: 2026-03-14
**Status**: Complete

## Entity Relationship Overview

```
User 1──1 Driver (optional, only if role=driver)
User 1──* Order (as customer)
Driver 1──* Order (as assigned driver)
Order 1──* OrderItem
Order 1──1 Payment
Order *──1 Store
User 1──* DeliveryAddress
```

---

## Entities

### User

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | VARCHAR(255) | NOT NULL | |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Used for login |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt, min 10 salt rounds |
| role | ENUM('customer', 'driver', 'admin') | NOT NULL | Single role per user |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Validation Rules**:
- Email must be valid format and unique across all users
- Password minimum 8 characters before hashing
- Role is immutable after creation (admin-managed)

---

### Driver

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| user_id | UUID | FK → User.id, UNIQUE, NOT NULL | 1:1 with User |
| vehicle_type | VARCHAR(100) | NOT NULL | e.g., "bicycle", "motorcycle", "car" |
| status | ENUM('pending_approval', 'available', 'busy', 'offline', 'suspended') | NOT NULL, DEFAULT 'pending_approval' | |
| rating | DECIMAL(3,2) | DEFAULT 5.00 | 1.00–5.00 scale |
| cancellation_count | INTEGER | NOT NULL, DEFAULT 0 | Tracks voluntary cancellations |
| latitude | DECIMAL(10,8) | NULLABLE | Last known latitude |
| longitude | DECIMAL(11,8) | NULLABLE | Last known longitude |
| location_updated_at | TIMESTAMP | NULLABLE | When location was last reported |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**State Transitions**:
```
pending_approval → available (admin approves)
pending_approval → suspended (admin rejects)
available → busy (accepts order)
available → offline (goes off duty)
busy → available (completes delivery or order cancelled)
busy → offline (completes delivery and goes off duty)
offline → available (comes back on duty)
available → suspended (admin action)
suspended → available (admin reinstates)
```

**Validation Rules**:
- `user_id` must reference a User with `role=driver`
- Rating clamped to [1.00, 5.00]
- Location fields are both null or both non-null

---

### Store

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | VARCHAR(255) | NOT NULL | e.g., "Kauai Canal Walk" |
| address | TEXT | NOT NULL | Full street address |
| latitude | DECIMAL(10,8) | NOT NULL | For GPS verification + distance calc |
| longitude | DECIMAL(11,8) | NOT NULL | For GPS verification + distance calc |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Admin can deactivate |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Validation Rules**:
- Latitude: -90 to 90
- Longitude: -180 to 180
- Name must be unique

---

### DeliveryAddress

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| user_id | UUID | FK → User.id, NOT NULL | |
| label | VARCHAR(100) | NULLABLE | e.g., "Home", "Work" |
| address | TEXT | NOT NULL | Full street address |
| latitude | DECIMAL(10,8) | NOT NULL | Geocoded via Nominatim |
| longitude | DECIMAL(11,8) | NOT NULL | Geocoded via Nominatim |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Validation Rules**:
- Only one address per user can have `is_default=TRUE`
- `user_id` must reference a User with `role=customer`

---

### Order

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| order_number | VARCHAR(20) | NOT NULL, UNIQUE | Human-readable, e.g., "ORD-A1B2C3" |
| customer_id | UUID | FK → User.id, NOT NULL | |
| store_id | UUID | FK → Store.id, NOT NULL | Nearest Kauai store |
| driver_id | UUID | FK → Driver.id, NULLABLE | Null until driver accepts |
| delivery_address_id | UUID | FK → DeliveryAddress.id, NOT NULL | |
| status | ENUM (see below) | NOT NULL, DEFAULT 'pending_driver' | |
| distance_km | DECIMAL(5,2) | NOT NULL | Store → delivery address distance |
| delivery_fee | INTEGER | NOT NULL | Amount in cents (3500 or 4500) |
| qr_payload | TEXT | NULLABLE | Signed QR JSON payload |
| qr_expires_at | TIMESTAMP | NULLABLE | QR validity window |
| payment_token | VARCHAR(255) | NULLABLE | PayFast card token (encrypted) |
| cancelled_reason | TEXT | NULLABLE | Reason if cancelled |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Order Statuses**:
```
pending_driver → driver_assigned → pickup_confirmed → in_transit → delivered
pending_driver → cancelled (timeout or customer cancel)
driver_assigned → pending_driver (driver cancels → re-broadcast)
pickup_confirmed → in_transit
in_transit → delivered
in_transit → payment_pending (payment failure after delivery)
```

**Validation Rules**:
- `delivery_fee` is 3500 (0–4km) or 4500 (5–10km) in cents
- `distance_km` must be ≤ 10.00
- `customer_id` must reference a User with `role=customer`
- `driver_id` must reference a Driver with `status != pending_approval`

---

### OrderItem

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| order_id | UUID | FK → Order.id, NOT NULL | |
| voucher_code | VARCHAR(50) | NULLABLE | Text voucher number |
| voucher_image_url | VARCHAR(500) | NULLABLE | Uploaded image URL |
| smoothie_item | VARCHAR(255) | NOT NULL | Selected menu item name |
| voucher_status | ENUM('pending', 'valid', 'invalid', 'replaced', 'cancelled') | NOT NULL, DEFAULT 'pending' | |
| replacement_deadline | TIMESTAMP | NULLABLE | 5-min countdown for invalid voucher |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**State Transitions**:
```
pending → valid (driver redeems at POS)
pending → invalid (driver reports invalid at POS)
invalid → replaced (customer submits replacement within 5 min)
invalid → cancelled (countdown expires without replacement)
replaced → valid (replacement voucher redeemed at POS)
replaced → invalid (replacement also invalid)
```

**Validation Rules**:
- Exactly one of `voucher_code` or `voucher_image_url` must be non-null
- Each OrderItem maps 1:1 to a smoothie item
- `smoothie_item` must match a valid menu item

---

### Payment

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| order_id | UUID | FK → Order.id, UNIQUE, NOT NULL | 1:1 with Order |
| amount | INTEGER | NOT NULL | Total in cents (3500 or 4500) |
| driver_amount | INTEGER | NOT NULL | Driver portion in cents |
| platform_amount | INTEGER | NOT NULL | Platform portion in cents |
| status | ENUM('pending', 'authorized', 'captured', 'failed', 'refunded') | NOT NULL, DEFAULT 'pending' | |
| payfast_token | VARCHAR(255) | NULLABLE | PayFast payment token |
| payfast_payment_id | VARCHAR(255) | NULLABLE | PayFast transaction reference |
| failure_reason | TEXT | NULLABLE | If status=failed |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**State Transitions**:
```
pending → authorized (card tokenized at order creation)
authorized → captured (QR scanned, charge successful)
authorized → failed (charge attempt failed)
authorized → refunded (order cancelled after authorization)
failed → captured (retry successful)
captured → refunded (admin-initiated refund)
```

**Validation Rules**:
- `amount = driver_amount + platform_amount`
- For R35 tier: driver_amount=2000, platform_amount=1500
- For R45 tier: driver_amount=2571, platform_amount=1929 (same ~57/43 ratio) — OR define fixed splits per tier (to be confirmed)
- Only one payment per order

---

### OrderAudit

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| order_id | UUID | FK → Order.id, NOT NULL | |
| previous_status | VARCHAR(50) | NULLABLE | Null for creation event |
| new_status | VARCHAR(50) | NOT NULL | |
| actor_id | UUID | FK → User.id, NULLABLE | Null for system actions |
| actor_type | ENUM('customer', 'driver', 'admin', 'system') | NOT NULL | |
| metadata | JSONB | NULLABLE | Additional context (e.g., cancellation reason, GPS coords) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Notes**:
- Append-only table, no updates or deletes
- Supports FR-026 (complete audit trail)

---

### MenuItem

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | VARCHAR(255) | NOT NULL, UNIQUE | e.g., "Berry Blaze Smoothie" |
| category | VARCHAR(100) | NULLABLE | e.g., "Smoothies", "Juices" |
| is_available | BOOLEAN | NOT NULL, DEFAULT TRUE | Admin can toggle |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Notes**:
- Simple lookup table, manually managed by admin
- No real-time POS integration per assumptions

---

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| User | idx_user_email | email | Login lookup |
| Order | idx_order_customer | customer_id | Customer order history |
| Order | idx_order_driver | driver_id | Driver active orders |
| Order | idx_order_status | status | Status-based filtering |
| Order | idx_order_store | store_id | Store-based queries |
| Order | idx_order_number | order_number | Human-readable lookup |
| OrderItem | idx_orderitem_order | order_id | Items per order |
| Payment | idx_payment_order | order_id | Payment lookup |
| Payment | idx_payment_status | status | Pending payment queries |
| Driver | idx_driver_status | status | Available driver queries |
| Driver | idx_driver_user | user_id | User-to-driver lookup |
| DeliveryAddress | idx_address_user | user_id | User addresses |
| OrderAudit | idx_audit_order | order_id | Audit trail per order |
| Store | idx_store_active | is_active | Active store listing |

---

## Payment Split Logic

| Distance Tier | Total Fee | Driver Amount | Platform Amount |
|---------------|-----------|---------------|-----------------|
| 0–4 km | R35.00 (3500c) | R20.00 (2000c) | R15.00 (1500c) |
| 5–10 km | R45.00 (4500c) | R25.71 (2571c) | R19.29 (1929c) |

> **Note**: The 5–10km split maintains the same approximate 57/43 ratio as the 0–4km tier. The exact split for the R45 tier should be confirmed with stakeholders — an alternative is a fixed R25/R20 split. Amounts stored in cents to avoid floating-point issues.
