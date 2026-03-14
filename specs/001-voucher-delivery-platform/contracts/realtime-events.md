# Realtime Event Contracts: Voucher Delivery Platform

**Feature**: 001-voucher-delivery-platform
**Date**: 2026-03-14
**Transport**: Supabase Realtime (WebSocket)

## Channels

### 1. Order Status Channel

**Channel**: `orders:{orderId}`
**Subscribers**: Customer (own order), Driver (assigned order)

**Event: Order Status Change**
Triggered by: Any `status` update on the `orders` table.

```json
{
  "event": "postgres_changes",
  "schema": "public",
  "table": "orders",
  "filter": "id=eq.{orderId}",
  "payload": {
    "old": { "status": "pending_driver" },
    "new": {
      "id": "uuid",
      "status": "driver_assigned",
      "driver_id": "uuid",
      "updated_at": "2026-03-14T16:05:00Z"
    }
  }
}
```

**Consumer Actions by Status**:
- `driver_assigned`: Customer sees "Driver on the way to store", Driver sees order details
- `pickup_confirmed`: Customer sees "Driver has your smoothie"
- `in_transit`: Customer sees "Driver is on the way"
- `delivered`: Customer sees "Delivered! Payment processed", Driver sees "Delivery complete"
- `cancelled`: Both see cancellation notice with reason

---

### 2. Driver Broadcast Channel

**Channel**: `driver-broadcast:{storeId}`
**Subscribers**: Available drivers within broadcast radius of the store

**Event: New Order Available**
Triggered by: System dispatch service when a new order enters `pending_driver`.

```json
{
  "type": "broadcast",
  "event": "new_order",
  "payload": {
    "orderId": "uuid",
    "orderNumber": "ORD-A1B2C3",
    "storeName": "Kauai Canal Walk",
    "storeLatitude": -33.8930,
    "storeLongitude": 18.5127,
    "itemCount": 2,
    "distanceTier": "ideal",
    "deliveryDistanceKm": 3.2,
    "deliveryFee": 3500,
    "createdAt": "2026-03-14T16:00:00Z"
  }
}
```

**Event: Order Claimed**
Triggered by: When a driver accepts the order.

```json
{
  "type": "broadcast",
  "event": "order_claimed",
  "payload": {
    "orderId": "uuid",
    "claimedByDriverId": "uuid"
  }
}
```

**Notes**:
- Drivers must unsubscribe from orders they cannot claim
- Client-side filtering by distance tier (ideal vs acceptable)
- If tier=ideal broadcast yields no claim within window, re-broadcast with tier=acceptable

---

### 3. Voucher Replacement Channel

**Channel**: `voucher-replace:{orderId}`
**Subscribers**: Customer (own order), Driver (assigned order)

**Event: Voucher Reported Invalid**
Triggered by: Driver marking an OrderItem voucher as invalid.

```json
{
  "type": "broadcast",
  "event": "voucher_invalid",
  "payload": {
    "orderItemId": "uuid",
    "smoothieItem": "Berry Blaze Smoothie",
    "replacementDeadline": "2026-03-14T16:10:00Z",
    "countdownSeconds": 300
  }
}
```

**Event: Voucher Replaced**
Triggered by: Customer submitting a replacement voucher.

```json
{
  "type": "broadcast",
  "event": "voucher_replaced",
  "payload": {
    "orderItemId": "uuid",
    "newVoucherCode": "new-code",
    "newVoucherImageUrl": null
  }
}
```

**Event: Replacement Expired**
Triggered by: System when the 5-minute countdown expires.

```json
{
  "type": "broadcast",
  "event": "voucher_expired",
  "payload": {
    "orderItemId": "uuid",
    "cancellationFeeCharged": true
  }
}
```

---

## Subscription Patterns

### Customer App
```typescript
// Order tracking
supabase.channel(`orders:${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, handleStatusChange)
  .subscribe()

// Voucher replacement alerts
supabase.channel(`voucher-replace:${orderId}`)
  .on('broadcast', { event: 'voucher_invalid' }, handleVoucherInvalid)
  .subscribe()
```

### Driver App
```typescript
// Available orders broadcast
supabase.channel(`driver-broadcast:${storeId}`)
  .on('broadcast', { event: 'new_order' }, handleNewOrder)
  .on('broadcast', { event: 'order_claimed' }, handleOrderClaimed)
  .subscribe()

// Active order tracking
supabase.channel(`orders:${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`
  }, handleStatusChange)
  .subscribe()

// Voucher replacement from customer
supabase.channel(`voucher-replace:${orderId}`)
  .on('broadcast', { event: 'voucher_replaced' }, handleVoucherReplaced)
  .subscribe()
```
