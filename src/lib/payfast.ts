import crypto from "crypto";

// ---- PayFast configuration ----
const PAYFAST_SANDBOX_HOST = "https://sandbox.payfast.co.za";
const PAYFAST_LIVE_HOST = "https://www.payfast.co.za";

function getPayFastHost(): string {
  return process.env.PAYFAST_SANDBOX === "true" ? PAYFAST_SANDBOX_HOST : PAYFAST_LIVE_HOST;
}

function getMerchantConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (!merchantId || !merchantKey) {
    throw new Error("Missing PAYFAST_MERCHANT_ID or PAYFAST_MERCHANT_KEY");
  }

  return { merchantId, merchantKey, passphrase };
}

// ---- Types ----
export interface PayFastTokenizeParams {
  orderId: string;
  amount: number; // in cents
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PayFastTokenizeResult {
  redirectUrl: string;
  paymentId: string;
}

export interface PayFastChargeParams {
  token: string;
  amount: number; // in cents
  orderId: string;
  itemName: string;
}

export interface PayFastChargeResult {
  success: boolean;
  payfastPaymentId?: string;
  error?: string;
}

export interface PayFastITNPayload {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  token?: string;
  [key: string]: string | undefined;
}

// ---- Generate a PayFast MD5 signature ----
export function generateSignature(
  data: Record<string, string | undefined>,
  passphrase?: string,
): string {
  // Build query string from data (sorted by key for consistency)
  const filteredData: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== "" && key !== "signature") {
      filteredData[key] = val;
    }
  }

  const queryString = Object.entries(filteredData)
    .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
    .join("&");

  const stringToHash = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
    : queryString;

  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// ---- Validate an incoming ITN signature ----
export function validateSignature(
  payload: PayFastITNPayload,
  passphrase?: string,
): boolean {
  const { signature, ...rest } = payload;

  if (!signature) return false;

  const expectedSignature = generateSignature(
    rest as Record<string, string | undefined>,
    passphrase,
  );

  return expectedSignature === signature;
}

// ---- Create a tokenization (recurring billing) redirect URL ----
// In sandbox: returns the redirect URL to send the customer to
export async function createToken(
  params: PayFastTokenizeParams,
): Promise<PayFastTokenizeResult> {
  const { merchantId, merchantKey, passphrase } = getMerchantConfig();
  const host = getPayFastHost();

  // Convert cents to ZAR (PayFast expects decimal format)
  const amountZar = (params.amount / 100).toFixed(2);

  const paymentData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.customerEmail,
    m_payment_id: params.orderId,
    amount: amountZar,
    item_name: `CodiDash Delivery - Order ${params.orderId}`,
    subscription_type: "2", // tokenization (ad-hoc payments)
  };

  const signature = generateSignature(paymentData, passphrase);
  paymentData.signature = signature;

  const queryString = new URLSearchParams(paymentData).toString();
  const redirectUrl = `${host}/eng/process?${queryString}`;

  return {
    redirectUrl,
    paymentId: params.orderId,
  };
}

// ---- Charge a stored token (ad-hoc payment) ----
export async function chargeToken(
  params: PayFastChargeParams,
): Promise<PayFastChargeResult> {
  const { merchantId, merchantKey, passphrase } = getMerchantConfig();
  const host = getPayFastHost();

  const amountZar = (params.amount / 100).toFixed(2);

  const chargeData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    m_payment_id: params.orderId,
    amount: amountZar,
    item_name: params.itemName,
    token: params.token,
  };

  const signature = generateSignature(chargeData, passphrase);
  chargeData.signature = signature;

  try {
    const response = await fetch(`${host}/subscriptions/${params.token}/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "version": "v1",
        "merchant-id": merchantId,
      },
      body: new URLSearchParams(chargeData).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `PayFast charge failed: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json() as { data?: { response?: string } };
    const payfastPaymentId = result?.data?.response;

    return {
      success: true,
      payfastPaymentId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---- Verify an ITN (Instant Transfer Notification) from PayFast ----
export async function verifyITN(
  payload: PayFastITNPayload,
  rawBody: string,
  sourceIp: string,
): Promise<{ valid: boolean; error?: string }> {
  // 1. Validate signature
  const { passphrase } = getMerchantConfig();
  const signatureValid = validateSignature(payload, passphrase);

  if (!signatureValid) {
    return { valid: false, error: "Invalid signature" };
  }

  // 2. Validate source IP (PayFast sandbox IPs are different from live)
  const isSandbox = process.env.PAYFAST_SANDBOX === "true";
  const allowedIps = isSandbox
    ? ["127.0.0.1", "::1"] // In sandbox, allow localhost for testing
    : [
        "197.97.145.144",
        "197.97.145.145",
        "197.97.145.146",
        "197.97.145.147",
      ];

  if (!allowedIps.includes(sourceIp)) {
    return { valid: false, error: `Untrusted source IP: ${sourceIp}` };
  }

  // 3. Verify with PayFast servers (sandbox: skip, live: perform)
  if (!isSandbox) {
    try {
      const host = getPayFastHost();
      const verifyResponse = await fetch(`${host}/eng/query/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: rawBody,
      });

      const verifyText = await verifyResponse.text();
      if (verifyText !== "VALID") {
        return { valid: false, error: "PayFast validation failed" };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Verification request failed",
      };
    }
  }

  return { valid: true };
}
