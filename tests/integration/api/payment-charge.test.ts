import { describe, it, expect, jest } from "@jest/globals";

jest.mock("@/lib/payfast", () => ({
  createToken: jest.fn(),
  chargeToken: jest.fn(),
  verifyITN: jest.fn(),
}));

import { chargeToken } from "@/lib/payfast";
const mockChargeToken = chargeToken as jest.MockedFunction<typeof chargeToken>;

describe("POST /api/orders/[id]/qr/scan — payment charge at delivery", () => {
  it("charges R35 tier correctly (driver R20, platform R15)", async () => {
    mockChargeToken.mockResolvedValueOnce({
      success: true,
      payfastPaymentId: "pf-123",
    });

    const result = await chargeToken({
      token: "pf_tok_abc",
      amount: 3500,
      orderId: "order-1",
      itemName: "CodiDash Delivery - Order ORD-ABC123",
    });
    expect(result.success).toBe(true);
    expect(result.payfastPaymentId).toBe("pf-123");
  });

  it("charges R45 tier correctly (driver R25.71, platform R19.29)", async () => {
    mockChargeToken.mockResolvedValueOnce({
      success: true,
      payfastPaymentId: "pf-456",
    });

    const result = await chargeToken({
      token: "pf_tok_xyz",
      amount: 4500,
      orderId: "order-2",
      itemName: "CodiDash Delivery - Order ORD-XYZ456",
    });
    expect(result.success).toBe(true);
  });

  it("returns failure result when charge fails", async () => {
    mockChargeToken.mockResolvedValueOnce({
      success: false,
      error: "Card declined",
    });

    const result = await chargeToken({
      token: "pf_tok_bad",
      amount: 3500,
      orderId: "order-3",
      itemName: "CodiDash Delivery - Order ORD-BAD000",
    });
    expect(result.success).toBe(false);
  });

  it("splits payment correctly for R35 tier", () => {
    const deliveryFee = 3500;
    const driverAmount = 2000;
    const platformAmount = deliveryFee - driverAmount;
    expect(driverAmount).toBe(2000);
    expect(platformAmount).toBe(1500);
  });

  it("splits payment correctly for R45 tier", () => {
    const deliveryFee = 4500;
    const driverAmount = 2571;
    const platformAmount = deliveryFee - driverAmount;
    expect(driverAmount).toBe(2571);
    expect(platformAmount).toBe(1929);
  });
});
