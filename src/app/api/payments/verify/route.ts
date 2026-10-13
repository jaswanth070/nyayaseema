import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Order, Receipt } from "@/lib/order";
import { gatewayConfig, readToken, signToken, verifyPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Called by the browser after Razorpay Checkout succeeds. No webhook: we trust the payment only
 * if the signature Razorpay returned verifies against our key secret for this exact order.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const claim = readToken<{ t: string; order: Order }>(b.orderToken);
  if (!claim || claim.t !== "order") return NextResponse.json({ error: "Invalid order token" }, { status: 400 });
  const { order } = claim;
  if (Date.now() - new Date(order.createdAt).getTime() > ORDER_TTL_MS)
    return NextResponse.json({ error: "Order expired" }, { status: 400 });

  const orderId = String(b.razorpay_order_id ?? "");
  const paymentId = String(b.razorpay_payment_id ?? "");
  const signature = String(b.razorpay_signature ?? "");
  const cfg = gatewayConfig();

  if (orderId !== order.id || !paymentId || !verifyPaymentSignature(orderId, paymentId, signature, cfg.keySecret)) {
    return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
  }

  const duty = order.lines.find((l) => l.kind === "duty");
  const receipt: Receipt = {
    order,
    paymentId,
    paidAt: new Date().toISOString(),
    // Simulated hand-off. A real integration must remit via an ICEGATE-authorised payment channel.
    icegate: duty
      ? { reference: `ICG-SIM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, status: "SIMULATED", amountPaise: duty.amount }
      : undefined,
  };
  return NextResponse.json({ receiptToken: signToken({ t: "receipt", receipt }) });
}
