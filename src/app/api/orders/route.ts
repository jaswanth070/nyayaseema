import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { FLOWS, type FlowId } from "@/lib/catalog";
import type { Order } from "@/lib/order";
import { quote, type QuoteInput } from "@/lib/pricing";
import { createRazorpayOrder, gatewayConfig, signToken } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body extends QuoteInput {
  customer?: { name?: string };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.flow || !(body.flow in FLOWS)) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

  const name = typeof body.customer?.name === "string" ? body.customer.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "Passenger name is required" }, { status: 400 });

  // Server-authoritative pricing: the client never sends an amount.
  const q = quote({
    flow: body.flow as FlowId,
    lawyerId: body.lawyerId,
    jurisdictionId: body.jurisdictionId,
    declaration: body.declaration,
    estimatedDuty: body.estimatedDuty,
  });
  if ("error" in q) return NextResponse.json({ error: q.error }, { status: 400 });

  const cfg = gatewayConfig();
  const receipt = `NS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  let orderId: string;
  try {
    if (cfg.mode === "live") {
      const ro = await createRazorpayOrder(cfg, {
        amount: q.total,
        receipt,
        notes: { flow: body.flow, customer: name, lawyer: body.lawyerId ?? "" },
      });
      orderId = ro.id;
    } else {
      orderId = `order_mock_${crypto.randomBytes(7).toString("hex")}`;
    }
  } catch (e) {
    console.error("[orders] Razorpay order creation failed:", e);
    return NextResponse.json({ error: "Could not create payment order. Please try again." }, { status: 502 });
  }

  const order: Order = {
    id: orderId,
    receipt,
    mode: cfg.mode,
    flow: body.flow as FlowId,
    amount: q.total,
    currency: "INR",
    lines: q.lines,
    customer: { name },
    lawyerId: body.lawyerId,
    jurisdictionId: body.jurisdictionId,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    order,
    orderToken: signToken({ t: "order", order }),
    // Publishable key only; the secret never leaves the server.
    keyId: cfg.mode === "live" ? cfg.keyId : null,
  });
}
