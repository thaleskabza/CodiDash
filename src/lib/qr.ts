import crypto from "crypto";
import QRCode from "qrcode";

// ---- Constants ----
const QR_EXPIRY_MINUTES = 30;
const HMAC_ALGORITHM = "sha256";

// ---- Types ----
export interface QRPayload {
  orderId: string;
  timestamp: number; // Unix ms
  nonce: string;
}

export interface SignedQRPayload extends QRPayload {
  signature: string;
}

export interface GenerateQRResult {
  qrDataUrl: string; // PNG as base64 data URL
  payload: SignedQRPayload;
  expiresAt: Date;
}

// ---- Generate a cryptographically secure nonce ----
function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ---- Sign a payload with HMAC-SHA256 ----
export function signPayload(payload: QRPayload): string {
  const secret = process.env.QR_HMAC_SECRET;
  if (!secret) {
    throw new Error("QR_HMAC_SECRET environment variable is not set");
  }

  // Deterministic serialisation: sort keys to ensure consistent signatures
  const data = JSON.stringify({
    orderId: payload.orderId,
    timestamp: payload.timestamp,
    nonce: payload.nonce,
  });

  return crypto.createHmac(HMAC_ALGORITHM, secret).update(data).digest("hex");
}

// ---- Verify a signed QR payload ----
export function verifySignature(payload: SignedQRPayload): boolean {
  const { signature, ...rest } = payload;
  const expectedSignature = signPayload(rest);

  // Use timingSafeEqual to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ---- Check if a QR payload timestamp is expired ----
export function isExpired(timestamp: number, expiryMinutes = QR_EXPIRY_MINUTES): boolean {
  const now = Date.now();
  const expiryMs = expiryMinutes * 60 * 1000;
  return now - timestamp > expiryMs;
}

// ---- Generate a signed QR code PNG data URL for an order ----
export async function generateQR(orderId: string): Promise<GenerateQRResult> {
  const timestamp = Date.now();
  const nonce = generateNonce();

  const payload: QRPayload = { orderId, timestamp, nonce };
  const signature = signPayload(payload);
  const signedPayload: SignedQRPayload = { ...payload, signature };

  const qrData = JSON.stringify(signedPayload);

  const qrDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: "M",
    type: "image/png",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  const expiresAt = new Date(timestamp + QR_EXPIRY_MINUTES * 60 * 1000);

  return {
    qrDataUrl,
    payload: signedPayload,
    expiresAt,
  };
}

// ---- Parse and validate a QR code string ----
export function parseAndVerifyQR(qrString: string): {
  valid: boolean;
  expired: boolean;
  payload: SignedQRPayload | null;
  error?: string;
} {
  let parsed: SignedQRPayload;

  try {
    parsed = JSON.parse(qrString) as SignedQRPayload;
  } catch {
    return { valid: false, expired: false, payload: null, error: "Invalid JSON" };
  }

  if (!parsed.orderId || !parsed.timestamp || !parsed.nonce || !parsed.signature) {
    return { valid: false, expired: false, payload: null, error: "Missing required fields" };
  }

  const expired = isExpired(parsed.timestamp);
  if (expired) {
    return { valid: false, expired: true, payload: parsed, error: "QR code has expired" };
  }

  const valid = verifySignature(parsed);
  if (!valid) {
    return { valid: false, expired: false, payload: parsed, error: "Invalid signature" };
  }

  return { valid: true, expired: false, payload: parsed };
}
