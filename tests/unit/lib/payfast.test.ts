import {
  generateSignature,
  validateSignature,
  createToken,
  chargeToken,
  verifyITN,
  type PayFastITNPayload,
} from "@/lib/payfast";

// ---- Test environment setup ----
beforeEach(() => {
  process.env.PAYFAST_MERCHANT_ID = "10000100";
  process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";
  process.env.PAYFAST_PASSPHRASE = "jt7NOE43FZPn";
  process.env.PAYFAST_SANDBOX = "true";
});

afterEach(() => {
  delete process.env.PAYFAST_MERCHANT_ID;
  delete process.env.PAYFAST_MERCHANT_KEY;
  delete process.env.PAYFAST_PASSPHRASE;
  delete process.env.PAYFAST_SANDBOX;
  jest.restoreAllMocks();
});

// ---- generateSignature ----
describe("generateSignature", () => {
  it("returns a 32-character MD5 hex string", () => {
    const data = {
      merchant_id: "10000100",
      merchant_key: "46f0cd694581a",
      amount: "35.00",
      item_name: "Test Item",
    };
    const sig = generateSignature(data);
    expect(sig).toMatch(/^[0-9a-f]{32}$/);
  });

  it("produces consistent output for same input", () => {
    const data = { merchant_id: "10000100", amount: "45.00", item_name: "CodiDash" };
    const sig1 = generateSignature(data);
    const sig2 = generateSignature(data);
    expect(sig1).toBe(sig2);
  });

  it("excludes signature field from hashing", () => {
    const data = {
      merchant_id: "10000100",
      amount: "35.00",
      signature: "old-signature-should-be-excluded",
    };
    const dataNoSig = { merchant_id: "10000100", amount: "35.00" };
    expect(generateSignature(data)).toBe(generateSignature(dataNoSig));
  });

  it("excludes empty string values from hashing", () => {
    const data = { merchant_id: "10000100", amount: "35.00", empty_field: "" };
    const dataClean = { merchant_id: "10000100", amount: "35.00" };
    expect(generateSignature(data)).toBe(generateSignature(dataClean));
  });

  it("includes passphrase in signature when provided", () => {
    const data = { merchant_id: "10000100", amount: "35.00" };
    const sigNoPass = generateSignature(data);
    const sigWithPass = generateSignature(data, "mypassphrase");
    expect(sigNoPass).not.toBe(sigWithPass);
  });

  it("produces different signatures for different amounts", () => {
    const data35 = { merchant_id: "10000100", amount: "35.00" };
    const data45 = { merchant_id: "10000100", amount: "45.00" };
    expect(generateSignature(data35)).not.toBe(generateSignature(data45));
  });
});

// ---- validateSignature ----
describe("validateSignature", () => {
  const makePayload = (overrides: Partial<PayFastITNPayload> = {}): PayFastITNPayload => {
    const base = {
      m_payment_id: "order-123",
      pf_payment_id: "1234567",
      payment_status: "COMPLETE",
      item_name: "CodiDash Delivery",
      amount_gross: "35.00",
      amount_fee: "-1.23",
      amount_net: "33.77",
      ...overrides,
    };

    const signature = generateSignature(base, process.env.PAYFAST_PASSPHRASE);
    return { ...base, signature };
  };

  it("validates a correctly signed payload", () => {
    const payload = makePayload();
    expect(validateSignature(payload, process.env.PAYFAST_PASSPHRASE)).toBe(true);
  });

  it("rejects a payload with tampered amount", () => {
    const payload = makePayload({ amount_gross: "45.00" });
    const tampered: PayFastITNPayload = { ...payload, amount_gross: "0.01" };
    expect(validateSignature(tampered, process.env.PAYFAST_PASSPHRASE)).toBe(false);
  });

  it("rejects a payload with tampered payment_status", () => {
    const payload = makePayload();
    const tampered: PayFastITNPayload = { ...payload, payment_status: "FAILED" };
    expect(validateSignature(tampered, process.env.PAYFAST_PASSPHRASE)).toBe(false);
  });

  it("rejects a payload missing signature", () => {
    const payload = makePayload();
    const { signature, ...noSig } = payload;
    expect(validateSignature(noSig as PayFastITNPayload, process.env.PAYFAST_PASSPHRASE)).toBe(false);
  });

  it("validates payload correctly without passphrase", () => {
    const base = {
      m_payment_id: "order-999",
      pf_payment_id: "9876543",
      payment_status: "COMPLETE",
      item_name: "Test",
      amount_gross: "35.00",
      amount_fee: "-1.00",
      amount_net: "34.00",
    };
    const signature = generateSignature(base); // no passphrase
    const payload: PayFastITNPayload = { ...base, signature };
    expect(validateSignature(payload)).toBe(true);
  });
});

// ---- createToken ----
describe("createToken", () => {
  it("returns a redirect URL and paymentId", async () => {
    const result = await createToken({
      orderId: "order-abc",
      amount: 3500, // R35.00
      customerEmail: "test@example.com",
      customerName: "Test User",
      returnUrl: "http://localhost:3000/orders/order-abc/success",
      cancelUrl: "http://localhost:3000/orders/order-abc/cancel",
      notifyUrl: "http://localhost:3000/api/payments/webhook",
    });

    expect(result.redirectUrl).toContain("sandbox.payfast.co.za");
    expect(result.redirectUrl).toContain("10000100"); // merchant_id
    expect(result.redirectUrl).toContain("35.00"); // R35 in decimal
    expect(result.paymentId).toBe("order-abc");
  });

  it("uses live URL when PAYFAST_SANDBOX is false", async () => {
    process.env.PAYFAST_SANDBOX = "false";

    const result = await createToken({
      orderId: "order-def",
      amount: 4500, // R45.00
      customerEmail: "test@example.com",
      customerName: "Test User",
      returnUrl: "https://app.codidash.co.za/success",
      cancelUrl: "https://app.codidash.co.za/cancel",
      notifyUrl: "https://app.codidash.co.za/api/payments/webhook",
    });

    expect(result.redirectUrl).toContain("www.payfast.co.za");
    expect(result.redirectUrl).toContain("45.00"); // R45 in decimal
  });

  it("converts cents to ZAR correctly (3500 → 35.00)", async () => {
    const result = await createToken({
      orderId: "order-cents",
      amount: 3500,
      customerEmail: "test@example.com",
      customerName: "Test",
      returnUrl: "http://localhost:3000/return",
      cancelUrl: "http://localhost:3000/cancel",
      notifyUrl: "http://localhost:3000/notify",
    });

    expect(result.redirectUrl).toContain("amount=35.00");
  });

  it("converts cents to ZAR correctly (4500 → 45.00)", async () => {
    const result = await createToken({
      orderId: "order-cents-2",
      amount: 4500,
      customerEmail: "test@example.com",
      customerName: "Test",
      returnUrl: "http://localhost:3000/return",
      cancelUrl: "http://localhost:3000/cancel",
      notifyUrl: "http://localhost:3000/notify",
    });

    expect(result.redirectUrl).toContain("amount=45.00");
  });

  it("throws when PAYFAST_MERCHANT_ID is missing", async () => {
    delete process.env.PAYFAST_MERCHANT_ID;

    await expect(
      createToken({
        orderId: "order-fail",
        amount: 3500,
        customerEmail: "test@example.com",
        customerName: "Test",
        returnUrl: "http://localhost:3000/return",
        cancelUrl: "http://localhost:3000/cancel",
        notifyUrl: "http://localhost:3000/notify",
      }),
    ).rejects.toThrow("PAYFAST_MERCHANT_ID");
  });
});

// ---- verifyITN ----
describe("verifyITN", () => {
  const validPayload: PayFastITNPayload = {
    m_payment_id: "order-123",
    pf_payment_id: "1234567",
    payment_status: "COMPLETE",
    item_name: "CodiDash Delivery",
    amount_gross: "35.00",
    amount_fee: "-1.23",
    amount_net: "33.77",
    signature: "",
  };

  beforeEach(() => {
    // Generate a valid signature
    const sig = generateSignature(
      { ...validPayload, signature: undefined },
      process.env.PAYFAST_PASSPHRASE,
    );
    validPayload.signature = sig;
  });

  it("returns valid for a correctly signed ITN from sandbox localhost", async () => {
    const result = await verifyITN(validPayload, "", "127.0.0.1");
    expect(result.valid).toBe(true);
  });

  it("returns invalid for an untrusted IP", async () => {
    const result = await verifyITN(validPayload, "", "1.2.3.4");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Untrusted source IP");
  });

  it("returns invalid for a tampered signature", async () => {
    const tampered: PayFastITNPayload = { ...validPayload, payment_status: "FAILED" };
    const result = await verifyITN(tampered, "", "127.0.0.1");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid signature");
  });

  it("returns invalid when signature is missing", async () => {
    const noSig: PayFastITNPayload = { ...validPayload, signature: "" };
    const result = await verifyITN(noSig, "", "127.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("also accepts ::1 (IPv6 localhost) in sandbox mode", async () => {
    const result = await verifyITN(validPayload, "", "::1");
    expect(result.valid).toBe(true);
  });
});
