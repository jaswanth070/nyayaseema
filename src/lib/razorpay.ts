import crypto from "node:crypto";

// Used only in demo mode (no Razorpay keys), where the demo gateway signs payments itself.
const MOCK_KEY_SECRET = "nyayaseema_mock_key_secret";
const MOCK_SIGNING_SECRET = "nyayaseema_mock_signing_secret";

export interface GatewayConfig {
  mode: "live" | "mock";
  keyId?: string;
  keySecret: string;
}

/** Credentials come from env. With no key pair the app runs in demo (mock) mode. */
export function gatewayConfig(): GatewayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (keyId && keySecret) return { mode: "live", keyId, keySecret };
  return { mode: "mock", keySecret: MOCK_KEY_SECRET };
}

/** Signs order/receipt tokens and CustomsQR certificates. Falls back to the key secret so it works with 2 env vars. */
export function signingSecret(): string {
  const s = process.env.SIGNING_SECRET?.trim();
  if (s) return s;
  const cfg = gatewayConfig();
  return cfg.mode === "live" ? cfg.keySecret : MOCK_SIGNING_SECRET;
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
  if (!res.ok) throw new Error(json?.error?.description ?? `Razorpay returned ${res.status}`);
  return json as RazorpayOrder;
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Razorpay Checkout signature: HMAC-SHA256("<order_id>|<payment_id>", key_secret), hex. */
export const paymentSignature = (orderId: string, paymentId: string, keySecret: string) =>
  crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

export const verifyPaymentSignature = (orderId: string, paymentId: string, signature: string, keySecret: string) =>
  safeEqual(paymentSignature(orderId, paymentId, keySecret), signature ?? "");

/** Stateless signed tokens: base64url(JSON).hmac. Lets the app run on serverless with no database. */
export function signToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken<T>(token: unknown): T | null {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", signingSecret()).update(body).digest("base64url");
  if (!safeEqual(expected, sig)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
