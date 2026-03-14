# Feature Specification: Voucher Delivery Platform (Model 2)

**Feature Branch**: `001-voucher-delivery-platform`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Voucher pickup + delivery logistics system for Discovery Vitality Kauai vouchers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Places a Voucher Delivery Order (Priority: P1)

A customer who has a Discovery Vitality Kauai voucher wants a smoothie delivered to their location without visiting the store. The customer logs in, uploads their voucher image or enters the voucher number, selects a smoothie item from the Kauai menu, enters their delivery address, and submits the order. The system confirms the order and provides a tracking view so the customer can monitor progress. The customer also receives a delivery QR code that the driver will scan upon arrival to confirm delivery and trigger the delivery fee payment.

**Why this priority**: This is the core value proposition of the platform. Without customers being able to place orders, no other functionality matters. This story represents the complete customer-side journey from order creation through delivery confirmation and payment.

**Independent Test**: Can be fully tested by a customer registering, logging in, submitting a voucher and smoothie selection, and receiving an order confirmation with a QR code. Delivers the fundamental ordering capability.

**Acceptance Scenarios**:

1. **Given** a registered customer is logged in, **When** they upload a voucher image, select a smoothie, enter a delivery address, and submit, **Then** the system creates an order with status "pending_driver" and displays a tracking view.
2. **Given** a customer has submitted an order, **When** the order is created successfully, **Then** a unique delivery QR code containing the order ID, timestamp, and signature is generated and displayed to the customer.
3. **Given** a customer has an active order, **When** they view the order tracking screen, **Then** they can see the current order status (pending_driver, driver_assigned, pickup_confirmed, in_transit, delivered).
4. **Given** a customer is placing an order, **When** they enter a voucher number that is empty or an image that fails to upload, **Then** the system displays a clear error and prevents order submission.
5. **Given** a customer has a saved delivery address, **When** they create a new order, **Then** the saved address is pre-filled and can be changed.

---

### User Story 2 - Driver Accepts and Fulfills an Order (Priority: P2)

A registered driver receives a notification of an available order. The driver views the order details (store location, voucher code/image, smoothie item) and accepts the order. The driver navigates to the Kauai store, presents the voucher to the cashier for redemption through the WiCode POS system, collects the smoothie, uploads a receipt photo, and confirms pickup. The driver then navigates to the customer's location, scans the customer's delivery QR code, which triggers the delivery fee payment of R35 (R20 to driver, R15 to platform). The driver receives payment confirmation.

**Why this priority**: Without drivers fulfilling orders, the platform cannot deliver value. This is the second critical path — the supply side of the marketplace. It depends on orders existing (US1) but is independently testable as a driver workflow.

**Independent Test**: Can be tested by a driver registering, logging in, accepting a pre-created order, confirming pickup with a receipt photo, scanning a delivery QR code, and receiving payment confirmation.

**Acceptance Scenarios**:

1. **Given** a driver is logged in and available, **When** a new order is created in their service area, **Then** the driver receives the order details including store name, voucher information, and smoothie item.
2. **Given** a driver has received order details, **When** they accept the order, **Then** the order status updates to "driver_assigned" and the customer is notified.
3. **Given** a driver has arrived at the store and collected the smoothie, **When** they upload a receipt photo and press "Confirm Pickup," **Then** the order status updates to "pickup_confirmed" and the customer is notified.
4. **Given** a driver has arrived at the customer location, **When** they scan the customer's delivery QR code, **Then** a delivery fee payment of R35 is initiated, split R20 to driver and R15 to platform.
5. **Given** a driver has scanned the delivery QR code, **When** the payment is processed successfully, **Then** the driver receives a payment confirmation and the order status updates to "delivered."
6. **Given** a driver is at the store, **When** the GPS location does not match the store coordinates within an acceptable radius, **Then** the system warns the driver and prevents pickup confirmation.

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

When a driver scans the customer's delivery QR code at the point of delivery, the system initiates a R35 delivery fee charge to the customer. The payment is processed through the payment gateway. Upon successful payment, the system automatically splits the amount: R20 credited to the driver's wallet and R15 to the platform. Driver earnings accumulate and are paid out via daily EFT transfers.

**Why this priority**: Payment is critical for revenue but depends on the order flow (US1, US2) being functional. The payment integration can be stubbed during early development and connected to the live gateway when ready.

**Independent Test**: Can be tested by simulating a QR scan event, verifying a payment request is created for R35, confirming the split logic allocates R20/R15 correctly, and verifying the driver wallet balance updates.

**Acceptance Scenarios**:

1. **Given** a driver scans a valid delivery QR code, **When** the payment is initiated, **Then** the customer is charged R35 through the payment gateway.
2. **Given** a successful payment of R35, **When** the split is applied, **Then** R20 is credited to the driver's wallet and R15 to the platform account.
3. **Given** a payment attempt fails (insufficient funds, network error), **When** the gateway returns an error, **Then** the system notifies both the driver and customer and the order remains in "in_transit" status for retry.
4. **Given** a driver has accumulated earnings, **When** the daily payout runs, **Then** the driver receives an EFT for their accumulated balance.

---

### Edge Cases

- What happens when a voucher has already been redeemed at the Kauai POS? The driver reports the failed redemption through the app, the order is cancelled, and the customer is notified without being charged.
- What happens when no driver is available to accept an order? The order remains in "pending_driver" status and the customer is notified of the delay. If no driver accepts within a configurable timeout (default: 30 minutes), the order is automatically cancelled.
- What happens when the customer's delivery QR code expires or is invalid? QR codes include a timestamp and signature. If the QR is older than the configurable validity window (default: 2 hours) or the signature is invalid, the scan is rejected and a new QR must be generated.
- What happens when a driver's GPS does not match the store location at pickup? The system prevents pickup confirmation and flags the order for admin review.
- What happens when payment fails after delivery has occurred? The order is marked as "payment_pending" and the customer is prompted to retry payment. The platform retains the delivery confirmation and does not require re-delivery.
- What happens when a driver accepts an order but does not complete it within a reasonable time? After a configurable timeout (default: 90 minutes from acceptance), the order is reassigned to another driver and the original driver's reliability rating is affected.

## Requirements *(mandatory)*

### Functional Requirements

**Customer Portal**

- **FR-001**: System MUST allow customers to register with name, email, and password.
- **FR-002**: System MUST authenticate customers via email and password with session-based login.
- **FR-003**: System MUST allow customers to save and manage multiple delivery addresses.
- **FR-004**: System MUST allow customers to upload a voucher image or enter a voucher number when placing an order.
- **FR-005**: System MUST display a selectable menu of Kauai smoothie items for order placement.
- **FR-006**: System MUST generate a unique delivery QR code per order containing order ID, timestamp, and cryptographic signature.
- **FR-007**: System MUST provide real-time order status tracking (pending_driver, driver_assigned, pickup_confirmed, in_transit, delivered).

**Driver Portal**

- **FR-008**: System MUST allow drivers to register with personal details and vehicle type.
- **FR-009**: System MUST require admin approval before a driver can accept orders.
- **FR-010**: System MUST notify available drivers of new orders in their service area.
- **FR-011**: System MUST display order details (store, voucher info, smoothie item, delivery address) to assigned drivers.
- **FR-012**: System MUST require drivers to upload a receipt photo before confirming store pickup.
- **FR-013**: System MUST verify driver GPS coordinates match the store location (within 200m radius) before allowing pickup confirmation.
- **FR-014**: System MUST allow drivers to scan customer delivery QR codes to trigger payment.

**Admin Portal**

- **FR-015**: System MUST provide a dashboard showing all orders with filtering by status, date, store, and driver.
- **FR-016**: System MUST allow admins to approve, suspend, and manage driver accounts.
- **FR-017**: System MUST display revenue summaries showing total revenue, driver payouts, and platform earnings.
- **FR-018**: System MUST flag orders with anomalies (missing receipt photo, GPS mismatch, expired QR) for fraud review.

**Payment**

- **FR-019**: System MUST charge customers a R35 delivery fee upon successful QR scan at delivery.
- **FR-020**: System MUST split each payment: R20 to driver wallet, R15 to platform.
- **FR-021**: System MUST support daily EFT payouts to drivers for accumulated earnings.
- **FR-022**: System MUST handle payment failures gracefully with retry capability and user notification.

**Order Flow**

- **FR-023**: System MUST assign orders to available drivers automatically or allow drivers to claim available orders.
- **FR-024**: System MUST cancel orders automatically if no driver accepts within 30 minutes (configurable).
- **FR-025**: System MUST reassign orders if a driver does not complete pickup within 90 minutes (configurable).
- **FR-026**: System MUST maintain a complete audit trail for each order (status changes, timestamps, actor).

**Security & Fraud**

- **FR-027**: System MUST encrypt all sensitive data (passwords, voucher codes, payment tokens) at rest and in transit.
- **FR-028**: System MUST enforce role-based access control separating customer, driver, and admin capabilities.
- **FR-029**: System MUST validate QR code signatures and expiry before processing delivery confirmation.

### Key Entities

- **User**: A person registered on the platform. Has a name, email, password (hashed), and role (customer, driver, or admin). A user can have one role.
- **Order**: A delivery request created by a customer. Links a customer, a voucher (code or image), a selected smoothie item, a delivery address, a store, and an assigned driver. Progresses through defined statuses.
- **Driver**: An extension of User with driver-specific attributes: vehicle type, availability status (available, busy, offline, suspended), and rating. Linked to a user account.
- **Payment**: A financial transaction linked to an order. Records the total amount (R35), driver portion (R20), platform portion (R15), and processing status. One payment per order.
- **Store**: A Kauai store location with name, address, and geographic coordinates. Used for driver navigation and GPS verification.

## Assumptions

- Voucher validation and redemption remain entirely within the Kauai POS / WiCode system. The platform does not validate vouchers — it only stores the voucher code or image for the driver to present at the store.
- The Kauai smoothie menu is relatively static and can be managed as a simple list within the platform (manual updates by admin). No real-time POS menu integration is required for MVP.
- Driver payout via daily EFT is handled through the payment gateway's built-in payout mechanism. Custom banking integration is not required for MVP.
- The delivery fee of R35 with a R20/R15 split is fixed for MVP. Dynamic pricing is a future enhancement.
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
- **SC-007**: Driver payouts are processed daily with 100% accuracy in the R20/R15 split calculation.
- **SC-008**: The platform achieves 50 orders per day within the first month of MVP launch in the pilot city.
- **SC-009**: Order status updates are visible to both customer and driver within 5 seconds of a status change event.
- **SC-010**: Admin can view a complete operational dashboard (orders, drivers, revenue, fraud alerts) with data no more than 1 minute stale.
