import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Receipt } from "@/lib/order";
import { readToken, signingSecret } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies a receipt token and returns its contents (plus the CustomsQR pass for scanner orders).
export async function GET(req: Request) {
  const claim = readToken<{ t: string; receipt: Receipt }>(new URL(req.url).searchParams.get("t"));
  if (!claim || claim.t !== "receipt") return NextResponse.json({ error: "Invalid or tampered receipt" }, { status: 400 });
  const { receipt } = claim;

  let certificate = null;
  if (receipt.order.flow === "scanner") {
    const id = `CSP-2026-${receipt.order.id.slice(-6).toUpperCase()}`;
    const payload = `${id}|${receipt.order.id}|${receipt.order.customer.name}|${receipt.paidAt}`;
    const signature = crypto.createHmac("sha256", signingSecret()).update(payload).digest("hex").slice(0, 32);
    certificate = { id, issuedAt: receipt.paidAt, signature, qr: `NYAYASEEMA|${id}|${receipt.order.id}|${signature}` };
  }
  return NextResponse.json({ receipt, certificate });
}
