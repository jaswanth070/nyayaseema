import crypto from "node:crypto";

export const MOCK_WEBHOOK_SECRET = "nyayaseema_mock_webhook_secret";

export interface GatewayConfig {
  mode: "live" | "mock";
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
}

/**
 * Credentials come from env. With no key pair the app runs in "mock" mode so the whole
 * flow (including webhook handling) can be exercised without a Razorpay account.
 */
export function gatewayConfig(): GatewayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (keyId && keySecret) return { mode: "live", keyId, keySecret, webhookSecret };
  return { mode: "mock", webhookSecret: webhookSecret || MOCK_WEBHOOK_SECRET };
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export async function createRazorpayOrder(
  cfg: GatewayConfig,
  body: { amount: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, currency: "INR" }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.description ?? `Razorpay returned ${res.status}`;
    throw new Error(msg);
  }
  return json as RazorpayOrder;
}

/** Razorpay signs the *raw* request body: HMAC-SHA256(body, webhook_secret), hex-encoded. */
export function signWebhook(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = Buffer.from(signWebhook(rawBody, secret), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function certificateSecret() {
  return process.env.CERT_SIGNING_SECRET?.trim() || "nyayaseema_dev_certificate_secret";
}
