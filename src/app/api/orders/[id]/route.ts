import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { certificateSecret } from "@/lib/razorpay";
import { getOrder, publicOrder, type Order } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function certificateFor(o: Order) {
  const id = `CSP-2026-${o.id.slice(-6).toUpperCase()}`;
  const payload = `${id}|${o.id}|${o.customer.name}|${o.paidAt}`;
  const signature = crypto.createHmac("sha256", certificateSecret()).update(payload).digest("hex").slice(0, 32);
  return { id, issuedAt: o.paidAt!, signature, qr: `NYAYASEEMA|${id}|${o.id}|${signature}` };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const certificate = order.status === "paid" && order.flow === "scanner" ? certificateFor(order) : null;
  return NextResponse.json({ order: publicOrder(order), certificate });
}
