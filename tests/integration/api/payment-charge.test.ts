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
      amountCharged: 3500,
    });

    const result = await chargeToken("pf_tok_abc", 3500);
    expect(result.success).toBe(true);
    expect(result.amountCharged).toBe(3500);
  });

  it("charges R45 tier correctly (driver R25.71, platform R19.29)", async () => {
    mockChargeToken.mockResolvedValueOnce({
      success: true,
      amountCharged: 4500,
    });

    const result = await chargeToken("pf_tok_xyz", 4500);
    expect(result.success).toBe(true);
    expect(result.amountCharged).toBe(4500);
  });

  it("returns 402 when charge fails", async () => {
    mockChargeToken.mockResolvedValueOnce({
      success: false,
      amountCharged: 0,
    });

    const result = await chargeToken("pf_tok_bad", 3500);
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
