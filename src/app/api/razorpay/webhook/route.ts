import { NextResponse } from "next/server";
import { gatewayConfig, verifyWebhookSignature } from "@/lib/razorpay";
import { applyWebhookEvent } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Configure in Razorpay Dashboard → Settings → Webhooks:
//   URL:    https://<your-host>/api/razorpay/webhook
//   Events: payment.captured, payment.failed, order.paid
export async function POST(req: Request) {
  const cfg = gatewayConfig();
  if (!cfg.webhookSecret) {
    return NextResponse.json({ error: "RAZORPAY_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  // Signature must be computed over the exact raw body, so read text() — never re-serialise JSON.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(rawBody, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const outcome = applyWebhookEvent(rawBody, req.headers.get("x-razorpay-event-id"));
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 400 });
  return NextResponse.json({ status: "ok", result: outcome.result });
}
