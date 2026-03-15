# Feature Specification: Voucher Delivery Platform (Model 2)

**Feature Branch**: `001-voucher-delivery-platform`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Voucher pickup + delivery logistics system for Discovery Vitality Kauai vouchers"

## Clarifications

### Session 2026-03-14

- Q: Driver dispatch model — auto-assign or claim-based? → A: Broadcast to nearby drivers; first driver to accept claims the order.
- Q: When does the customer provide payment details? → A: At order creation; card is captured/pre-authorized during checkout but charged only when the driver scans the delivery QR.
- Q: How is driver service area defined? → A: Radius from store — 2–3km ideal (most profitable), 3–4km acceptable (profitable). Orders broadcast to drivers within these tiers, prioritizing the inner radius first.
- Q: Can a driver voluntarily cancel after accepting an order? → A: Yes, with penalty. The cancellation count per driver is stored for later use (rating impact, suspension thresholds). The order returns to "pending_driver" and is re-broadcast.
- Q: Must the delivery address be within a max distance from the store, and what is the fee structure? → A: Tiered delivery pricing by distance from store. 0–4km: R35 delivery fee. 5–10km: R45 delivery fee. Addresses beyond 10km are rejected.
- Q: How many vouchers and items can a customer include per order? → A: Multiple vouchers allowed, each voucher maps to exactly one smoothie item (1:1 ratio). The frontend MUST validate that the number of vouchers matches the number of items — submission is blocked if mismatched. All items are bundled into a single delivery with one delivery fee.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Places a Voucher Delivery Order (Priority: P1)

A customer who has one or more Discovery Vitality Kauai vouchers wants smoothies delivered to their location without visiting the store. The customer logs in, uploads voucher images or enters voucher numbers (one per item), selects a matching smoothie item for each voucher from the Kauai menu, and enters their delivery address. The frontend enforces a strict 1:1 voucher-to-item ratio — submission is blocked if the counts do not match. The system calculates the delivery fee based on distance from the nearest Kauai store: R35 for 0–4km or R45 for 5–10km. Addresses beyond 10km are rejected. The customer reviews the fee, provides payment details, and submits the order. The payment method is captured and pre-authorized at checkout but not charged until the driver scans the delivery QR code upon arrival. The system confirms the order and provides a tracking view so the customer can monitor progress. The customer also receives a delivery QR code that the driver will scan to confirm delivery and trigger the actual charge.

**Why this priority**: This is the core value proposition of the platform. Without customers being able to place orders, no other functionality matters. This story represents the complete customer-side journey from order creation through delivery confirmation and payment.

**Independent Test**: Can be fully tested by a customer registering, logging in, submitting a voucher and smoothie selection, and receiving an order confirmation with a QR code. Delivers the fundamental ordering capability.

**Acceptance Scenarios**:

1. **Given** a registered customer is logged in, **When** they upload one or more vouchers, select a matching smoothie item for each voucher, enter a delivery address within 10km of a Kauai store, provide payment details, and submit, **Then** the system calculates the delivery fee (R35 for 0–4km, R45 for 5–10km), pre-authorizes the calculated amount, creates an order with status "pending_driver," and displays a tracking view showing the fee and all items.
2. **Given** a customer has added 3 vouchers but only selected 1 smoothie item (or vice versa), **When** they attempt to submit, **Then** the frontend blocks submission and displays an error indicating the voucher and item counts must match (1:1 ratio).
3. **Given** a customer enters a delivery address beyond 10km from any Kauai store, **When** they attempt to submit the order, **Then** the system rejects the order with a message indicating the address is outside the delivery area.
4. **Given** a customer has submitted an order, **When** the order is created successfully, **Then** a unique delivery QR code containing the order ID, timestamp, and signature is generated and displayed to the customer.
5. **Given** a customer has an active order, **When** they view the order tracking screen, **Then** they can see the current order status (pending_driver, driver_assigned, pickup_confirmed, in_transit, delivered).
6. **Given** a customer is placing an order, **When** they enter a voucher number that is empty or an image that fails to upload, **Then** the system displays a clear error and prevents order submission.
7. **Given** a customer has a saved delivery address, **When** they create a new order, **Then** the saved address is pre-filled and can be changed.

---

### User Story 2 - Driver Accepts and Fulfills an Order (Priority: P2)

A registered driver receives a broadcast notification of an available order. The driver views the order details (store location, voucher codes/images, smoothie items, delivery distance tier) and accepts the order. The driver navigates to the Kauai store, presents each voucher to the cashier for redemption through the WiCode POS system, collects all smoothies for the order, uploads a receipt photo, and confirms pickup. The driver then navigates to the customer's location, scans the customer's delivery QR code, which triggers the distance-based delivery fee charge (R35 for 0–4km, R45 for 5–10km). The driver receives payment confirmation.

**Why this priority**: Without drivers fulfilling orders, the platform cannot deliver value. This is the second critical path — the supply side of the marketplace. It depends on orders existing (US1) but is independently testable as a driver workflow.

**Independent Test**: Can be tested by a driver registering, logging in, accepting a pre-created order, confirming pickup with a receipt photo, scanning a delivery QR code, and receiving payment confirmation.

**Acceptance Scenarios**:

1. **Given** a driver is logged in, available, and within 2–3km of a pickup store, **When** a new order is created for that store, **Then** the order is broadcast to the driver with store name, voucher information, and smoothie item. If no driver in the 2–3km tier claims the order within a configurable window, the broadcast expands to drivers within 3–4km.
2. **Given** multiple drivers receive a broadcast order, **When** one driver accepts the order, **Then** the order status updates to "driver_assigned," the claiming driver is assigned, other drivers see the order removed, and the customer is notified.
3. **Given** a driver has arrived at the store and collected the smoothie, **When** they upload a receipt photo and press "Confirm Pickup," **Then** the order status updates to "pickup_confirmed" and the customer is notified.
4. **Given** a driver has arrived at the customer location, **When** they scan the customer's delivery QR code, **Then** the pre-authorized delivery fee (R35 for 0–4km or R45 for 5–10km) is charged, with the appropriate split applied.
5. **Given** a driver has scanned the delivery QR code, **When** the payment is processed successfully, **Then** the driver receives a payment confirmation and the order status updates to "delivered."
6. **Given** a driver is at the store, **When** the GPS location does not match the store coordinates within an acceptable radius, **Then** the system warns the driver and prevents pickup confirmation.
7. **Given** a driver is at the store and the cashier reports a voucher as invalid, **When** the driver marks the voucher as invalid in the app, **Then** the customer is notified and a 5-minute countdown begins for the customer to submit a replacement voucher.
8. **Given** a customer receives an invalid voucher notification with a 5-minute countdown, **When** they submit a valid replacement voucher within the window, **Then** the driver's order view updates with the new voucher and the driver proceeds with redemption.
9. **Given** a customer receives an invalid voucher notification with a 5-minute countdown, **When** the countdown expires without a replacement, **Then** the affected voucher-item pair is cancelled, the customer is charged a cancellation fee, and the driver proceeds with any remaining valid items (or the entire order is cancelled if no valid items remain).

---

### User Story 3 - Admin Monitors Platform Operations (Priority: P3)

An administrator logs into the admin portal to monitor overall platform health. They can view all active and completed orders, manage driver accounts (approve, suspend, review), track revenue and payment splits, monitor voucher usage patterns, and review flagged orders for potential fraud (missing receipt photos, GPS mismatches, QR anomalies).

**Why this priority**: Admin operations are essential for production readiness but do not block the core customer-driver order flow. The platform can operate in MVP with manual oversight initially while the admin portal is built out.

**Independent Test**: Can be tested by an admin logging in, viewing a dashboard of orders with status filters, viewing driver profiles, and seeing revenue summaries. Delivers operational visibility independently.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they access the order monitoring view, **Then** they see a list of all orders with status, customer, driver, store, and timestamps, filterable by status and date range.
2. **Given** an admin is reviewing drivers, **When** they view the driver management section, **Then** they can see all registered drivers with their status, rating, vehicle type, and order history.
3. **Given** an admin is reviewing revenue, **When** they access the revenue tracking view, **Then** they see total revenue, driver payouts, platform earnings, and order counts for configurable time periods.
4. **Given** an admin is reviewing fraud alerts, **When** they view the fraud detection section, **Then** they see orders flagged for missing receipt photos, GPS mismatches at pickup, or suspicious QR scan patterns.

---

### User Story 4 - Customer Registration and Account Management (Priority: P4)

A new customer registers for the platform by providing their name, email, and password. After registration, they can log in, save delivery addresses for reuse, and manage their account profile. Returning customers can log in and access their saved addresses and order history.

**Why this priority**: Registration is a prerequisite for placing orders but is a well-understood pattern. It can be implemented with standard authentication flows and is independently testable.

**Independent Test**: Can be tested by a new user registering, logging in, saving a delivery address, logging out, and logging back in to verify the address persists.

**Acceptance Scenarios**:

1. **Given** a new user visits the platform, **When** they provide a valid name, email, and password, **Then** an account is created and they are logged in.
2. **Given** a registered user, **When** they log in with valid credentials, **Then** they are authenticated and directed to the order creation screen.
3. **Given** a logged-in customer, **When** they save a delivery address, **Then** the address is persisted and available for future orders.
4. **Given** a user provides an email that is already registered, **When** they attempt to register, **Then** the system displays an error indicating the email is already in use.

---

### User Story 5 - Driver Registration and Onboarding (Priority: P5)

A new driver registers by providing their personal details, vehicle type, and relevant documentation. After registration and approval, they can log in to start accepting orders. The driver profile includes their vehicle type, rating, and availability status.

**Why this priority**: Driver registration is necessary for the supply side but follows standard patterns and can be implemented independently. Admin approval of drivers adds a trust layer.

**Independent Test**: Can be tested by a driver registering, providing vehicle details, and upon approval, logging in to see an empty order queue.

**Acceptance Scenarios**:

1. **Given** a new driver visits the registration page, **When** they provide personal details and vehicle type, **Then** a driver account is created with "pending_approval" status.
2. **Given** a driver with "pending_approval" status, **When** an admin approves them, **Then** the driver status changes to "available" and they can start accepting orders.
3. **Given** an approved driver, **When** they log in, **Then** they see their dashboard with availability toggle and any pending orders in their area.

---

### User Story 6 - Delivery Fee Payment Processing (Priority: P6)

When a driver scans the customer's delivery QR code at the point of delivery, the system charges the pre-authorized delivery fee to the customer. The fee is distance-based: R35 for deliveries within 0–4km of the store, or R45 for deliveries within 5–10km. The payment is processed through the payment gateway. Upon successful payment, the system automatically applies the payment split. Driver earnings accumulate and are paid out via daily EFT transfers.

**Why this priority**: Payment is critical for revenue but depends on the order flow (US1, US2) being functional. The payment integration can be stubbed during early development and connected to the live gateway when ready.

**Independent Test**: Can be tested by simulating QR scan events for both distance tiers, verifying the correct fee is charged (R35 or R45), confirming the split logic applies correctly per tier, and verifying the driver wallet balance updates.

**Acceptance Scenarios**:

1. **Given** a driver scans a valid delivery QR code for an order within 0–4km, **When** the payment is initiated, **Then** the customer is charged R35 through the payment gateway.
2. **Given** a driver scans a valid delivery QR code for an order within 5–10km, **When** the payment is initiated, **Then** the customer is charged R45 through the payment gateway.
3. **Given** a successful payment, **When** the split is applied, **Then** the driver and platform portions are credited according to the fee tier.
4. **Given** a payment attempt fails (insufficient funds, network error), **When** the gateway returns an error, **Then** the system notifies both the driver and customer and the order remains in "in_transit" status for retry.
5. **Given** a driver has accumulated earnings, **When** the daily payout runs, **Then** the driver receives an EFT for their accumulated balance.

---

### Edge Cases

- What happens when a voucher is found to be invalid or already redeemed at the Kauai POS? The driver reports the invalid voucher through the app. The customer is immediately notified and given a 5-minute countdown to submit a replacement voucher. If the customer provides a valid replacement within 5 minutes, the driver proceeds with the updated voucher. If the countdown expires without a replacement, the order (or the affected voucher-item pair in a multi-voucher order) is cancelled and the customer is charged a cancellation fee for the invalid voucher.
- What happens when no driver is available to accept an order? The order remains in "pending_driver" status and the customer is notified of the delay. If no driver accepts within a configurable timeout (default: 30 minutes), the order is automatically cancelled.
- What happens when the customer's delivery QR code expires or is invalid? QR codes include a timestamp and signature. If the QR is older than the configurable validity window (default: 2 hours) or the signature is invalid, the scan is rejected and a new QR must be generated.
- What happens when a driver's GPS does not match the store location at pickup? The system prevents pickup confirmation and flags the order for admin review.
- What happens when payment fails after delivery has occurred? The order is marked as "payment_pending" and the customer is prompted to retry payment. The platform retains the delivery confirmation and does not require re-delivery.
- What happens when a driver accepts an order but does not complete it within a reasonable time? After a configurable timeout (default: 90 minutes from acceptance), the order is reassigned to another driver and the original driver's reliability rating is affected.
- What happens when a driver voluntarily cancels after accepting? The driver can cancel at any time before delivery. The order returns to "pending_driver" status and is re-broadcast. The system records the cancellation against the driver's cancellation count for future use (rating impact, suspension threshold evaluation).
- What happens when an order has multiple vouchers but one fails redemption at the Kauai POS? The driver reports the specific failed voucher(s) through the app. The customer receives a 5-minute countdown to replace each failed voucher. Successfully redeemed items proceed normally. For any voucher not replaced within the countdown, the voucher-item pair is removed from the order and a cancellation fee is charged for that invalid voucher. The order continues with the remaining valid items.

## Requirements *(mandatory)*

### Functional Requirements

**Customer Portal**

- **FR-001**: System MUST allow customers to register with name, email, and password.
- **FR-002**: System MUST authenticate customers via email and password with session-based login.
- **FR-003**: System MUST allow customers to save and manage multiple delivery addresses.
- **FR-004**: System MUST allow customers to add one or more vouchers per order (upload image or enter number for each). Each voucher MUST be paired with exactly one smoothie item (1:1 ratio). The frontend MUST validate that the voucher count equals the item count and block submission on mismatch.
- **FR-005**: System MUST display a selectable menu of Kauai smoothie items for order placement, allowing the customer to select one item per voucher.
- **FR-006**: System MUST generate a unique delivery QR code per order containing order ID, timestamp, and cryptographic signature.
- **FR-007**: System MUST provide real-time order status tracking (pending_driver, driver_assigned, pickup_confirmed, in_transit, delivered).

**Driver Portal**

- **FR-008**: System MUST allow drivers to register with personal details and vehicle type.
- **FR-009**: System MUST require admin approval before a driver can accept orders.
- **FR-010**: System MUST broadcast new orders to available drivers within a tiered radius of the pickup store: 2–3km (ideal/priority tier) first, expanding to 3–4km (acceptable tier) if no driver claims within a configurable window. Orders MUST NOT be broadcast beyond 4km.
- **FR-011**: System MUST display order details (store, all voucher codes/images, all smoothie items, delivery address) to assigned drivers.
- **FR-012**: System MUST require drivers to upload a receipt photo before confirming store pickup.
- **FR-013**: System MUST verify driver GPS coordinates match the store location (within 200m radius) before allowing pickup confirmation.
- **FR-014**: System MUST allow drivers to scan customer delivery QR codes to trigger payment.

**Admin Portal**

- **FR-015**: System MUST provide a dashboard showing all orders with filtering by status, date, store, and driver.
- **FR-016**: System MUST allow admins to approve, suspend, and manage driver accounts.
- **FR-017**: System MUST display revenue summaries showing total revenue, driver payouts, and platform earnings.
- **FR-018**: System MUST flag orders with anomalies (missing receipt photo, GPS mismatch, expired QR) for fraud review.

**Payment**

- **FR-019**: System MUST calculate the delivery fee based on distance from the pickup store to the delivery address (R35 for 0–4km, R45 for 5–10km), display the fee to the customer before checkout, capture and pre-authorize the amount at order creation, and charge only upon successful delivery QR scan. Addresses beyond 10km MUST be rejected.
- **FR-020**: System MUST split each payment between driver wallet and platform according to the applicable fee tier.
- **FR-021**: System MUST support daily EFT payouts to drivers for accumulated earnings.
- **FR-022**: System MUST handle payment failures gracefully with retry capability and user notification.

**Order Flow**

- **FR-023**: System MUST broadcast new orders to all available drivers in the service area; the first driver to accept claims the order exclusively.
- **FR-024**: System MUST cancel orders automatically if no driver accepts within 30 minutes (configurable).
- **FR-025**: System MUST reassign orders if a driver does not complete pickup within 90 minutes (configurable).
- **FR-026**: System MUST maintain a complete audit trail for each order (status changes, timestamps, actor).
- **FR-030**: System MUST allow drivers to voluntarily cancel an accepted order at any time before delivery. The order MUST return to "pending_driver" and be re-broadcast. The system MUST record the cancellation count per driver for future evaluation.
- **FR-031**: When a driver reports a voucher as invalid at the POS, the system MUST notify the customer and start a 5-minute countdown for the customer to submit a replacement voucher. If a valid replacement is submitted within 5 minutes, the order MUST continue with the updated voucher. If the countdown expires, the affected voucher-item pair MUST be cancelled.
- **FR-032**: System MUST charge the customer a cancellation fee for each invalid voucher that is not replaced within the 5-minute window. The cancellation fee applies regardless of whether the rest of the order proceeds.

**Security & Fraud**

- **FR-027**: System MUST encrypt all sensitive data (passwords, voucher codes, payment tokens) at rest and in transit.
- **FR-028**: System MUST enforce role-based access control separating customer, driver, and admin capabilities.
- **FR-029**: System MUST validate QR code signatures and expiry before processing delivery confirmation.

### Key Entities

- **User**: A person registered on the platform. Has a name, email, password (hashed), and role (customer, driver, or admin). A user can have one role.
- **Order**: A delivery request created by a customer. Links a customer, one or more voucher-item pairs (each pair is one voucher code/image mapped to one smoothie item), a delivery address, a store, and an assigned driver. Progresses through defined statuses. One delivery fee per order regardless of item count.
- **OrderItem**: A line item within an order. Each OrderItem pairs exactly one voucher (code or image) with one smoothie item. An order contains one or more OrderItems.
- **Driver**: An extension of User with driver-specific attributes: vehicle type, availability status (available, busy, offline, suspended), rating, and cancellation count. Linked to a user account.
- **Payment**: A financial transaction linked to an order. Records the total amount (R35 or R45 based on distance tier), driver portion, platform portion, and processing status. One payment per order.
- **Store**: A Kauai store location with name, address, and geographic coordinates. Used for driver navigation and GPS verification.

## Assumptions

- Voucher validation and redemption remain entirely within the Kauai POS / WiCode system. The platform does not validate vouchers — it only stores the voucher code or image for the driver to present at the store.
- The Kauai smoothie menu is relatively static and can be managed as a simple list within the platform (manual updates by admin). No real-time POS menu integration is required for MVP.
- Driver payout via daily EFT is handled through the payment gateway's built-in payout mechanism. Custom banking integration is not required for MVP.
- The delivery fee is distance-tiered for MVP: R35 (0–4km) and R45 (5–10km). The payment split per tier is fixed. Further dynamic pricing (surge, demand-based) is a future enhancement.
- The platform operates in South African Rand (ZAR) only for MVP.
- The MVP launches in a single city with 5 Kauai stores and 10 drivers, targeting 50 orders per day.
- Mobile access is through a mobile-optimised web application, not native apps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can complete the full order flow (login, voucher upload, smoothie selection, address entry, submission) in under 3 minutes.
- **SC-002**: Drivers can accept an order, complete store pickup, and confirm delivery in under 45 minutes on average within the MVP city.
- **SC-003**: 95% of delivery QR code scans successfully trigger payment processing on the first attempt.
- **SC-004**: The platform supports at least 50 concurrent orders without degradation in order tracking or payment processing.
- **SC-005**: 90% of customers successfully place their first order without requiring support assistance.
- **SC-006**: Fraud detection flags at least 90% of orders with missing receipt photos or GPS mismatches within 1 minute of the anomaly occurring.
- **SC-007**: Driver payouts are processed daily with 100% accuracy in the distance-tiered split calculation.
- **SC-008**: The platform achieves 50 orders per day within the first month of MVP launch in the pilot city.
- **SC-009**: Order status updates are visible to both customer and driver within 5 seconds of a status change event.
- **SC-010**: Admin can view a complete operational dashboard (orders, drivers, revenue, fraud alerts) with data no more than 1 minute stale.
