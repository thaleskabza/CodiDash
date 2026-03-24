import {
  signPayload,
  verifySignature,
  isExpired,
  generateQR,
  parseAndVerifyQR,
  type QRPayload,
  type SignedQRPayload,
} from "@/lib/qr";

// Set a test secret before all tests
const TEST_QR_SECRET = "test-qr-hmac-secret-at-least-32-chars-long!!";

beforeEach(() => {
  process.env.QR_HMAC_SECRET = TEST_QR_SECRET;
});

afterEach(() => {
  delete process.env.QR_HMAC_SECRET;
  jest.restoreAllMocks();
});

describe("signPayload", () => {
  const payload: QRPayload = {
    orderId: "order-123",
    timestamp: 1700000000000,
    nonce: "abc123",
  };

  it("returns a hex string", () => {
    const sig = signPayload(payload);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic output for the same input", () => {
    const sig1 = signPayload(payload);
    const sig2 = signPayload(payload);
    expect(sig1).toBe(sig2);
  });

  it("produces different output for different orderId", () => {
    const sig1 = signPayload(payload);
    const sig2 = signPayload({ ...payload, orderId: "order-999" });
    expect(sig1).not.toBe(sig2);
  });

  it("produces different output for different timestamp", () => {
    const sig1 = signPayload(payload);
    const sig2 = signPayload({ ...payload, timestamp: 9999999999999 });
    expect(sig1).not.toBe(sig2);
  });

  it("produces different output for different nonce", () => {
    const sig1 = signPayload(payload);
    const sig2 = signPayload({ ...payload, nonce: "different-nonce" });
    expect(sig1).not.toBe(sig2);
  });

  it("throws when QR_HMAC_SECRET is not set", () => {
    delete process.env.QR_HMAC_SECRET;
    expect(() => signPayload(payload)).toThrow("QR_HMAC_SECRET");
  });
});

describe("verifySignature", () => {
  const payload: QRPayload = {
    orderId: "order-456",
    timestamp: 1700000000000,
    nonce: "nonce-xyz",
  };

  it("returns true for a valid signature", () => {
    const signature = signPayload(payload);
    const signed: SignedQRPayload = { ...payload, signature };
    expect(verifySignature(signed)).toBe(true);
  });

  it("returns false for a tampered orderId", () => {
    const signature = signPayload(payload);
    const tampered: SignedQRPayload = { ...payload, orderId: "tampered-id", signature };
    expect(verifySignature(tampered)).toBe(false);
  });

  it("returns false for a tampered timestamp", () => {
    const signature = signPayload(payload);
    const tampered: SignedQRPayload = { ...payload, timestamp: 0, signature };
    expect(verifySignature(tampered)).toBe(false);
  });

  it("returns false for a tampered nonce", () => {
    const signature = signPayload(payload);
    const tampered: SignedQRPayload = { ...payload, nonce: "tampered", signature };
    expect(verifySignature(tampered)).toBe(false);
  });

  it("returns false for a completely invalid signature", () => {
    const invalid: SignedQRPayload = {
      ...payload,
      signature: "0000000000000000000000000000000000000000000000000000000000000000",
    };
    expect(verifySignature(invalid)).toBe(false);
  });

  it("returns false for a signature with wrong length", () => {
    const invalid: SignedQRPayload = { ...payload, signature: "abc" };
    expect(verifySignature(invalid)).toBe(false);
  });
});

describe("isExpired", () => {
  it("returns false for a recent timestamp", () => {
    const now = Date.now();
    expect(isExpired(now)).toBe(false);
  });

  it("returns false for a timestamp just under 30 minutes ago", () => {
    const timestamp = Date.now() - 29 * 60 * 1000;
    expect(isExpired(timestamp)).toBe(false);
  });

  it("returns true for a timestamp exactly 30 minutes ago", () => {
    const timestamp = Date.now() - 30 * 60 * 1000 - 1;
    expect(isExpired(timestamp)).toBe(true);
  });

  it("returns true for a timestamp 1 hour ago", () => {
    const timestamp = Date.now() - 60 * 60 * 1000;
    expect(isExpired(timestamp)).toBe(true);
  });

  it("uses custom expiry minutes", () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 1;
    expect(isExpired(fiveMinutesAgo, 5)).toBe(true);
    expect(isExpired(fiveMinutesAgo, 10)).toBe(false);
  });
});

describe("generateQR", () => {
  it("returns a valid data URL", async () => {
    const result = await generateQR("order-789");
    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("returns a signed payload", async () => {
    const result = await generateQR("order-789");
    expect(result.payload.orderId).toBe("order-789");
    expect(result.payload.signature).toBeDefined();
    expect(result.payload.nonce).toBeDefined();
    expect(result.payload.timestamp).toBeGreaterThan(0);
  });

  it("sets expiresAt 30 minutes in the future", async () => {
    const before = new Date();
    const result = await generateQR("order-789");
    const after = new Date();

    const expectedExpiry = 30 * 60 * 1000;
    const actualExpiry = result.expiresAt.getTime() - before.getTime();

    expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + (after.getTime() - before.getTime()) + 1000);
  });

  it("generates unique nonces for each call", async () => {
    const [r1, r2] = await Promise.all([generateQR("order-A"), generateQR("order-A")]);
    expect(r1.payload.nonce).not.toBe(r2.payload.nonce);
  });

  it("generates a valid verifiable signature", async () => {
    const result = await generateQR("order-test");
    expect(verifySignature(result.payload)).toBe(true);
  });
});

describe("parseAndVerifyQR", () => {
  it("successfully parses a valid QR string", async () => {
    const generated = await generateQR("order-parse-test");
    const qrString = JSON.stringify(generated.payload);

    const result = parseAndVerifyQR(qrString);
    expect(result.valid).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.payload?.orderId).toBe("order-parse-test");
  });

  it("returns invalid for malformed JSON", () => {
    const result = parseAndVerifyQR("not-valid-json{{{");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid JSON");
  });

  it("returns invalid for missing required fields", () => {
    const result = parseAndVerifyQR(JSON.stringify({ orderId: "test" }));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing required fields");
  });

  it("returns expired for old QR code", async () => {
    const generated = await generateQR("order-expired");
    // Manually backdate the timestamp by 31 minutes
    const oldPayload: SignedQRPayload = {
      ...generated.payload,
      timestamp: Date.now() - 31 * 60 * 1000,
    };
    // Re-sign with the backdated timestamp
    const { signPayload: sign } = await import("@/lib/qr");
    const { signature, ...rest } = oldPayload;
    const newSig = sign(rest);
    const qrString = JSON.stringify({ ...rest, signature: newSig });

    const result = parseAndVerifyQR(qrString);
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("returns invalid for tampered signature", async () => {
    const generated = await generateQR("order-tamper");
    const tampered: SignedQRPayload = {
      ...generated.payload,
      orderId: "different-order",
    };
    const qrString = JSON.stringify(tampered);

    const result = parseAndVerifyQR(qrString);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("signature");
  });
});
