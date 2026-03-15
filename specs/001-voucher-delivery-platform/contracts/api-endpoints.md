# API Contracts: Voucher Delivery Platform

**Feature**: 001-voucher-delivery-platform
**Date**: 2026-03-14
**Base URL**: `/api`

## Authentication

All endpoints (except auth routes) require a valid NextAuth JWT session.
Role-based access is enforced via middleware — endpoints specify required roles.

### `POST /api/auth/[...nextauth]`
NextAuth.js handles registration, login, and session management.
- **Providers**: Credentials (email/password)
- **Session Strategy**: JWT
- **Token Payload**: `{ userId, email, role }`

---

## Orders

### `POST /api/orders`
Create a new delivery order.

**Auth**: customer

**Request Body**:
```json
{
  "storeId": "uuid",
  "deliveryAddressId": "uuid",
  "items": [
    {
      "voucherCode": "839203923",
      "voucherImageUrl": null,
      "smoothieItem": "Berry Blaze Smoothie"
    }
  ]
}
```

**Validation**:
- `items` array must have ≥ 1 item
- Each item must have exactly one of `voucherCode` or `voucherImageUrl`
- Each `smoothieItem` must match a valid MenuItem
- Delivery address must be within 10km of the store
- Customer must have a valid session

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "orderNumber": "ORD-A1B2C3",
  "status": "pending_driver",
  "storeId": "uuid",
  "storeName": "Kauai Canal Walk",
  "deliveryFee": 3500,
  "distanceKm": 3.2,
  "items": [
    {
      "id": "uuid",
      "smoothieItem": "Berry Blaze Smoothie",
      "voucherStatus": "pending"
    }
  ],
  "qrPayload": "base64-encoded-qr-image",
  "qrExpiresAt": "2026-03-14T18:00:00Z",
  "createdAt": "2026-03-14T16:00:00Z"
}
```

**Errors**:
- `400` — Validation error (item count mismatch, invalid menu item, etc.)
- `422` — Address beyond 10km
- `401` — Not authenticated
- `403` — Not a customer

---

### `GET /api/orders`
List orders for the current user.

**Auth**: customer, driver, admin

**Query Parameters**:
- `status` (optional): Filter by status
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response** `200 OK`:
```json
{
  "orders": [ /* Order objects */ ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Notes**:
- Customers see only their own orders
- Drivers see only their assigned orders
- Admins see all orders

---

### `GET /api/orders/:id`
Get order details including items.

**Auth**: customer (own), driver (assigned), admin

**Response** `200 OK`: Full order object with items array and audit trail.

---

### `PATCH /api/orders/:id`
Update order status.

**Auth**: driver, admin, system

**Request Body**:
```json
{
  "status": "pickup_confirmed",
  "receiptImageUrl": "https://...",
  "driverLatitude": -33.9249,
  "driverLongitude": 18.4241
}
```

**Status-specific validation**:
- `driver_assigned`: Only via accept endpoint
- `pickup_confirmed`: Requires `receiptImageUrl`, GPS within 200m of store
- `in_transit`: Driver only
- `delivered`: Only via QR scan endpoint
- `cancelled`: Customer (before driver_assigned) or system (timeout)

---

### `POST /api/orders/:id/accept`
Driver claims an order.

**Auth**: driver

**Validation**:
- Order must be in `pending_driver` status
- Driver must be `available`
- First-come-first-served (atomic claim)

**Response** `200 OK`:
```json
{
  "orderId": "uuid",
  "status": "driver_assigned",
  "driverId": "uuid"
}
```

**Errors**:
- `409` — Order already claimed by another driver

---

### `POST /api/orders/:id/cancel`
Cancel an order (driver voluntary cancellation or customer cancellation).

**Auth**: customer (own, before pickup), driver (assigned)

**Request Body**:
```json
{
  "reason": "optional cancellation reason"
}
```

**Side Effects**:
- Driver cancel: Increments `cancellation_count`, order returns to `pending_driver`
- Customer cancel: Refunds pre-authorization if applicable

---

## Order Items

### `PATCH /api/orders/:id/items/:itemId/voucher-status`
Driver reports voucher validity.

**Auth**: driver (assigned)

**Request Body**:
```json
{
  "voucherStatus": "invalid"
}
```

**Side Effects**:
- If `invalid`: Sets `replacement_deadline` to NOW + 5 minutes, notifies customer

---

### `PUT /api/orders/:id/items/:itemId/replace-voucher`
Customer replaces an invalid voucher.

**Auth**: customer (own)

**Request Body**:
```json
{
  "voucherCode": "new-code",
  "voucherImageUrl": null
}
```

**Validation**:
- Item must have `voucherStatus=invalid`
- `replacement_deadline` must not have expired

---

## QR Code

### `GET /api/orders/:id/qr`
Get or regenerate delivery QR code.

**Auth**: customer (own)

**Response** `200 OK`:
```json
{
  "qrPayload": "base64-encoded-qr-image",
  "qrData": {
    "oid": "uuid",
    "ts": 1710403200,
    "sig": "hmac-hex"
  },
  "expiresAt": "2026-03-14T18:00:00Z"
}
```

---

### `POST /api/orders/:id/qr/scan`
Driver scans customer QR to confirm delivery and trigger payment.

**Auth**: driver (assigned)

**Request Body**:
```json
{
  "qrData": {
    "oid": "uuid",
    "ts": 1710403200,
    "sig": "hmac-hex"
  }
}
```

**Validation**:
- Signature must be valid (HMAC-SHA256)
- Timestamp must be within 2-hour window
- `oid` must match the order ID
- Order must be in `in_transit` status

**Response** `200 OK`:
```json
{
  "orderId": "uuid",
  "status": "delivered",
  "paymentStatus": "captured",
  "amountCharged": 3500
}
```

**Errors**:
- `400` — Invalid or expired QR
- `402` — Payment failed (order moves to `payment_pending`)

---

## Drivers

### `GET /api/drivers`
List drivers.

**Auth**: admin

**Query Parameters**:
- `status` (optional): Filter by driver status
- `page`, `limit`: Pagination

---

### `PATCH /api/drivers/:id`
Update driver status (admin approval, suspension).

**Auth**: admin

**Request Body**:
```json
{
  "status": "available"
}
```

---

### `PUT /api/drivers/:id/location`
Update driver's current GPS location.

**Auth**: driver (own)

**Request Body**:
```json
{
  "latitude": -33.9249,
  "longitude": 18.4241
}
```

**Notes**: Called periodically by the driver portal via `watchPosition`.

---

## Dispatch

### `POST /api/dispatch/broadcast`
Internal endpoint: broadcast an order to nearby drivers.

**Auth**: system (internal only)

**Request Body**:
```json
{
  "orderId": "uuid",
  "storeId": "uuid",
  "tier": "ideal"
}
```

**Logic**:
1. Find available drivers within 2–3km of store (tier=ideal)
2. Send Supabase Realtime broadcast to those drivers
3. If no claim within configurable window, re-broadcast with tier=acceptable (3–4km)

---

## Payments

### `POST /api/payments/webhook`
PayFast ITN (Instant Transaction Notification) callback.

**Auth**: None (validated via PayFast IP whitelist + signature)

**Request Body**: PayFast ITN POST parameters (form-encoded).

**Validation**:
- Verify source IP against PayFast IP range
- Verify signature (MD5 of sorted params + passphrase)
- Verify payment amount matches order

---

## Stores

### `GET /api/stores`
List active Kauai stores.

**Auth**: customer, driver, admin

**Response** `200 OK`:
```json
{
  "stores": [
    {
      "id": "uuid",
      "name": "Kauai Canal Walk",
      "address": "Century Blvd, Century City, Cape Town",
      "latitude": -33.8930,
      "longitude": 18.5127,
      "isActive": true
    }
  ]
}
```

---

## File Uploads

### `POST /api/uploads`
Upload a voucher image or receipt photo.

**Auth**: customer, driver

**Request**: `multipart/form-data` with `file` field

**Validation**:
- Max file size: 5MB
- Allowed types: JPEG, PNG, WebP
- Image stored in Supabase Storage bucket

**Response** `201 Created`:
```json
{
  "url": "https://supabase-storage-url/..."
}
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "items",
        "message": "Voucher count (3) does not match item count (2)"
      }
    ]
  }
}
```

**Standard Error Codes**:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `UNPROCESSABLE` (422)
- `INTERNAL_ERROR` (500)
