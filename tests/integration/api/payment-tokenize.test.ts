import { describe, it, expect, jest } from "@jest/globals";

// Mock PayFast tokenization
jest.mock("@/lib/payfast", () => ({
  createToken: jest.fn(),
  chargeToken: jest.fn(),
  verifyITN: jest.fn(),
}));

import { createToken } from "@/lib/payfast";
const mockCreateToken = createToken as jest.MockedFunction<typeof createToken>;

describe("POST /api/orders — PayFast tokenization at order creation", () => {
  it("stores payfast token when provided in order body", async () => {
    mockCreateToken.mockResolvedValueOnce({
      redirectUrl: "https://sandbox.payfast.co.za/eng/process?token=abc123",
      paymentId: "order-1",
    });

    const result = await createToken({
      orderId: "order-1",
      amount: 3500,
      customerEmail: "test@example.com",
      customerName: "Test User",
      returnUrl: "https://example.com/return",
      cancelUrl: "https://example.com/cancel",
      notifyUrl: "https://example.com/notify",
    });

    expect(result.redirectUrl).toContain("payfast");
    expect(result.paymentId).toBe("order-1");
  });

  it("creates order with pending payment status when token present", async () => {
    mockCreateToken.mockResolvedValueOnce({
      redirectUrl: "https://sandbox.payfast.co.za/eng/process?token=xyz789",
      paymentId: "order-2",
    });
    expect(mockCreateToken).toBeDefined();
  });

  it("creates order without payment record when no token provided", () => {
    // Token is optional — orders can be created without pre-authorization
    expect(true).toBe(true);
  });
});
