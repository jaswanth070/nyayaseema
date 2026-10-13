import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { gatewayConfig, signWebhook } from "@/lib/razorpay";
import { getOrder } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo gateway (mock mode only). Plays the role of Razorpay: builds a payload shaped like a
 * real webhook, signs it, and POSTs it to our own /api/razorpay/webhook, so the demo exercises
 * the exact same verification + state-machine path as production.
 */
export async function POST(req: Request) {
  const cfg = gatewayConfig();
  if (cfg.mode !== "mock") return NextResponse.json({ error: "Not available" }, { status: 404 });

  const { orderId, outcome } = (await req.json().catch(() => ({}))) as { orderId?: string; outcome?: string };
  const order = orderId ? getOrder(orderId) : undefined;
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const paymentId = `pay_mock_${crypto.randomBytes(7).toString("hex")}`;
  const success = outcome !== "failure";
  const payment = {
    id: paymentId,
    entity: "payment",
    order_id: order.id,
    amount: order.amount,
    currency: "INR",
    status: success ? "captured" : "failed",
    method: "upi",
    ...(success ? {} : { error_code: "BAD_REQUEST_ERROR", error_description: "Payment declined by bank (demo)" }),
  };
  const raw = JSON.stringify({
    entity: "event",
    account_id: "acc_mock",
    event: success ? "payment.captured" : "payment.failed",
    contains: ["payment"],
    payload: { payment: { entity: payment } },
    created_at: Math.floor(Date.now() / 1000),
  });

  const res = await fetch(new URL("/api/razorpay/webhook", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Razorpay-Signature": signWebhook(raw, cfg.webhookSecret!),
      "X-Razorpay-Event-Id": `evt_mock_${crypto.randomBytes(8).toString("hex")}`,
    },
    body: raw,
  });
  return NextResponse.json({ delivered: res.ok, paymentId });
}
