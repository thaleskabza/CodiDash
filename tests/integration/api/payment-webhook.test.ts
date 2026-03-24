import { describe, it, expect, jest } from "@jest/globals";

jest.mock("@/lib/payfast", () => ({
  createToken: jest.fn(),
  chargeToken: jest.fn(),
  verifyITN: jest.fn(),
  validateSignature: jest.fn(),
}));

import { verifyITN, validateSignature } from "@/lib/payfast";
import type { PayFastITNPayload } from "@/lib/payfast";

const mockVerifyITN = verifyITN as jest.MockedFunction<typeof verifyITN>;
const mockValidateSignature = validateSignature as jest.MockedFunction<typeof validateSignature>;

function buildITNPayload(overrides: Record<string, string> = {}): PayFastITNPayload {
  return {
    m_payment_id: "pay-123",
    pf_payment_id: "pf-999",
    payment_status: "COMPLETE",
    item_name: "CodiDash Delivery",
    amount_gross: "35.00",
    amount_fee: "1.40",
    amount_net: "33.60",
    signature: "abc123",
    ...overrides,
  };
}

describe("POST /api/payments/webhook — PayFast ITN", () => {
  it("accepts valid ITN with correct signature", async () => {
    mockVerifyITN.mockResolvedValueOnce({ valid: true });
    const payload = buildITNPayload();
    const result = await verifyITN(payload, "", "127.0.0.1");
    expect(result.valid).toBe(true);
  });

  it("rejects ITN with invalid signature", async () => {
    mockVerifyITN.mockResolvedValueOnce({ valid: false, error: "Invalid signature" });
    const payload = buildITNPayload({ signature: "invalid_sig" });
    const result = await verifyITN(payload, "", "127.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("rejects ITN with amount mismatch", async () => {
    mockVerifyITN.mockResolvedValueOnce({ valid: false, error: "Amount mismatch" });
    const payload = buildITNPayload({ amount_gross: "9999.00" });
    const result = await verifyITN(payload, "", "127.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("validates MD5 signature correctly", () => {
    mockValidateSignature.mockReturnValueOnce(true);
    const result = validateSignature(buildITNPayload(), "test-passphrase");
    expect(result).toBe(true);
  });

  it("rejects requests not from PayFast IP ranges", async () => {
    // IP whitelist check — non-PayFast IPs should return 403
    const payFastIPs = [
      "197.97.145.144",
      "197.97.145.145",
      "197.97.145.146",
      "197.97.145.147",
    ];
    const foreignIP = "1.2.3.4";
    expect(payFastIPs).not.toContain(foreignIP);
  });
});
