# CodiDash Project Principles

## Mission
CodiDash aims to provide an open-source, production-grade platform for voucher delivery logistics. By leveraging modern technologies, we strive to simplify the process of redeeming and delivering vouchers while ensuring compliance, scalability, and community-driven development.

## Core Values
1. **Simplicity**: Keep the platform easy to use for all stakeholders, including customers, drivers, and administrators.
2. **Transparency**: Maintain open communication and clear documentation for contributors and users.
3. **Scalability**: Design the system to handle growth in users, orders, and geographic coverage.
4. **Compliance**: Ensure adherence to relevant regulations and standards, particularly in payment processing and data security.
5. **Community**: Foster a collaborative environment where developers can contribute and innovate.

## Guidelines for Contributors
1. **Code Quality**: Follow best practices for clean, maintainable, and well-documented code.
2. **Open Source Etiquette**: Respect the community by providing constructive feedback and adhering to the project's code of conduct.
3. **Testing**: Ensure all new features and bug fixes include appropriate tests.
4. **Documentation**: Update relevant documentation for any changes or additions to the codebase.
5. **Collaboration**: Engage with other contributors through discussions, pull requests, and issue tracking.

## Strategic Goals
1. Launch the MVP with a focus on the South African market.
2. Expand the platform to support additional voucher types and merchants.
3. Build a robust API for third-party integrations.
4. Establish a sustainable revenue model to support ongoing development.

## License
CodiDash is released under the MIT License, allowing for both community contributions and commercial use.

---

# Baseline Specification

## Model 2 – Voucher Delivery Platform

### Core Idea
Customer has a **Kauai Vitality voucher** → driver redeems it in store → customer pays delivery fee upon delivery.

This keeps the voucher redemption **inside the merchant POS system powered by the WiCode digital voucher platform used by Discovery Limited and merchants like Kauai.**

Your platform only handles **logistics and delivery payment**.

---

## 1. Business Requirements

### Objective
Allow customers with **Discovery Vitality Kauai vouchers** to receive smoothies delivered without visiting the store.

---

### Actors
- Customer
- Driver
- Your platform
- Kauai store
- Payment gateway

---

### Customer Portal Requirements

Account-based system.

Features:
- User registration
- Login
- Save delivery address
- Upload voucher image or enter voucher number
- Select smoothie item
- Track order
- QR code generation for delivery confirmation

---

### Driver Portal Requirements

Account-based system.

Features:
- Driver registration
- Driver login
- Accept order
- View pickup store
- View voucher code or image
- Navigate to store
- Confirm pickup
- Scan delivery QR code
- Receive payment confirmation

---

### Admin Portal Requirements

Monitor platform operations.

Features:
- Order monitoring
- Driver management
- Revenue tracking
- Voucher tracking
- Fraud detection

---

## 2. System Architecture

Open source architecture.

```
Client App
   │
   ▼
Next.js Frontend
   │
   ▼
Vercel API Routes
   │
   ├── Auth Service
   ├── Order Service
   ├── Dispatch Service
   ├── Payment Service
   └── QR Service
   │
   ▼
PostgreSQL Database
   │
   ▼
Driver Mobile Portal
```

Voucher validation happens outside system:

```
Driver → Kauai POS → WiCode
```

---

## 3. Database Design

### Users
```
users
-----
id
name
email
password
role
created_at
```

### Orders
```
orders
-----
id
customer_id
voucher_code
voucher_image
store
delivery_address
status
driver_id
created_at
```

### Drivers
```
drivers
-----
id
user_id
vehicle_type
rating
status
```

### Payments
```
payments
-----
id
order_id
amount
driver_amount
platform_amount
status
```

---

## 4. QR Delivery Payment

Customer QR code contains:

```
order_id
timestamp
signature
```

Driver scans QR to initiate payment.

Example QR payload:

```
{
 "order":"ORD82933",
 "action":"delivery_payment"
}
```

---

## 5. Payment Integration (Free API)

Best free developer integration for South Africa:

**PayFast**

Reasons:
- No monthly fee
- Simple API
- Supports card payments
- Easy webhook integration

---

## 6. Fraud Protection

### Voucher protection:
Store receipt photo required.

Driver must upload:
```
receipt image
```

### Location protection:
GPS verification at store.

### Delivery protection:
Customer QR required to complete delivery.

---

## 7. Revenue Model

Delivery fee:
```
R35
```

Split:
| Recipient | Amount |
| --------- | ------ |
| Driver    | R20    |
| Platform  | R15    |

---

## 8. MVP Launch Plan

### Phase 1
- 1 city
- 5 Kauai stores
- 10 drivers

Goal:
```
50 orders/day
```

---

## 9. Open Source License

Recommended:

**MIT License**

Allows:
- Community contribution
- Startup commercialization

---

## 10. Strategic Position

The platform becomes:
```
Voucher Logistics Infrastructure
```

Future expansions:
- Coffee vouchers
- Grocery vouchers
- Bank rewards
- Telecom rewards

---

## Testing Principles

1. **Comprehensive Coverage**: Ensure all critical features are covered by unit, integration, and end-to-end tests.
2. **Automation First**: Prioritize automated testing to maintain efficiency and consistency.
3. **Continuous Testing**: Integrate testing into the CI/CD pipeline to catch issues early.
4. **Open Source Tools**: Use free and open-source testing frameworks like Jest, Cypress, and Playwright.
5. **Mocking and Stubbing**: Simulate external dependencies to isolate components during testing.

---

## Software Development Principles

1. **Agile Methodology**: Follow iterative development cycles to adapt to changing requirements.
2. **Version Control**: Use Git for source control, with clear branching strategies (e.g., feature, development, and main branches).
3. **Code Reviews**: Enforce peer reviews for all pull requests to ensure code quality and knowledge sharing.
4. **Documentation**: Maintain up-to-date documentation for all features and APIs.
5. **Modular Design**: Build reusable and maintainable components to simplify future development.

---

## Security Best Practices

1. **Data Encryption**: Use HTTPS and encrypt sensitive data both in transit and at rest.
2. **Authentication and Authorization**: Implement secure authentication (e.g., NextAuth) and role-based access control.
3. **Dependency Management**: Regularly update dependencies and monitor for vulnerabilities using tools like Dependabot.
4. **Environment Variables**: Store sensitive configuration data in environment variables and avoid hardcoding secrets.
5. **Open Source Security**: Leverage free tools like OWASP ZAP for vulnerability scanning and security testing.

---

## Free and Open Source Services

1. **CI/CD**: Use GitHub Actions for continuous integration and deployment.
2. **Hosting**: Deploy the platform on Vercel for free hosting with serverless functions.
3. **Database**: Use Supabase or Neon for PostgreSQL database hosting.
4. **Monitoring**: Integrate Sentry for error tracking and monitoring.
5. **Collaboration**: Use GitHub Projects for task management and issue tracking.

---

## Implementation Plan

### Phase 1: Project Setup
1. **Repository Initialization**:
   - Set up the GitHub repository with the provided structure.
   - Add the MIT License and README.md.
2. **Environment Configuration**:
   - Configure Vercel for deployment.
   - Set up PostgreSQL database using Supabase or Neon.
   - Integrate GitHub Actions for CI/CD.
3. **Basic Frontend and Backend**:
   - Initialize Next.js for the frontend.
   - Create basic API routes using Vercel functions.

---

### Phase 2: Core Features Development
1. **Customer Portal**:
   - Implement user registration and login with NextAuth.
   - Develop features for saving delivery addresses and uploading voucher details.
   - Add functionality for selecting smoothie items and tracking orders.
   - Generate QR codes for delivery confirmation.
2. **Driver Portal**:
   - Implement driver registration and login.
   - Develop features for accepting orders, viewing store details, and navigating to stores.
   - Add functionality for confirming pickups and scanning delivery QR codes.
3. **Admin Portal**:
   - Implement order monitoring and driver management.
   - Add revenue and voucher tracking features.
   - Integrate basic fraud detection mechanisms.

---

### Phase 3: Payment Integration
1. **PayFast Integration**:
   - Implement payment request and webhook handling.
   - Develop logic for splitting payments between drivers and the platform.
2. **Driver Payouts**:
   - Add functionality for daily EFT payouts to drivers.

---

### Phase 4: Testing and Quality Assurance
1. **Automated Testing**:
   - Write unit, integration, and end-to-end tests using Jest and Cypress.
   - Mock external dependencies for isolated testing.
2. **Manual Testing**:
   - Conduct user acceptance testing for all portals.
   - Verify payment flows and QR code functionality.

---

### Phase 5: Deployment and Monitoring
1. **Deployment**:
   - Deploy the platform to Vercel.
   - Set up environment variables for production.
2. **Monitoring**:
   - Integrate Sentry for error tracking.
   - Use Supabase or Neon monitoring tools for database health.

---

### Phase 6: MVP Launch
1. **Pilot Program**:
   - Launch in one city with 5 Kauai stores and 10 drivers.
   - Monitor performance and gather feedback.
2. **Iterative Improvements**:
   - Address feedback and optimize the platform.
   - Prepare for scaling to additional cities and merchants.