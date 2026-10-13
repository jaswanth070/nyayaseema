import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Order } from "@/lib/order";
import { gatewayConfig, paymentSignature, readToken } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo gateway (mock mode only). Plays the role of Razorpay Checkout: returns the same
 * { razorpay_order_id, razorpay_payment_id, razorpay_signature } triple a real checkout hands the browser,
 * so the demo goes through the exact same /api/payments/verify path as production.
 */
export async function POST(req: Request) {
  const cfg = gatewayConfig();
  if (cfg.mode !== "mock") return NextResponse.json({ error: "Not available" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { orderToken?: string; outcome?: string };
  const claim = readToken<{ t: string; order: Order }>(b.orderToken);
  if (!claim || claim.t !== "order") return NextResponse.json({ error: "Invalid order token" }, { status: 400 });
  if (b.outcome === "failure") return NextResponse.json({ error: "Payment declined by bank (demo)" }, { status: 402 });

  const paymentId = `pay_mock_${crypto.randomBytes(7).toString("hex")}`;
  return NextResponse.json({
    razorpay_order_id: claim.order.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: paymentSignature(claim.order.id, paymentId, cfg.keySecret),
  });
}
