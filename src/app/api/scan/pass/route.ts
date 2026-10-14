import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { LineItem } from "@/lib/catalog";
import { calculateDuty } from "@/lib/duty";
import { signingSecret } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Free CustomsQR pass for the receipt scanner. No form, no payment: the server recomputes the estimate from
 * the scanned items and signs it. Stateless, so it works on serverless hosting.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { items?: LineItem[] };
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50)
    return NextResponse.json({ error: "Scan at least one receipt first" }, { status: 400 });
  for (const i of items) {
    if (!(i.amount > 0) || !(i.quantity >= 1) || !Number.isFinite(i.amount * i.quantity))
      return NextResponse.json({ error: "Invalid scanned item" }, { status: 400 });
  }

  const duty = calculateDuty({ items, gender: "male", stay: "3d-6m" });
  const dutyPaise = Math.round(duty.duty * 100);
  const id = `CSP-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const issuedAt = new Date().toISOString();
  const digest = crypto.createHash("sha256").update(JSON.stringify(duty.pricedItems.map((i) => [i.description, i.inr]))).digest("hex").slice(0, 16);
  const signature = crypto.createHmac("sha256", signingSecret()).update(`${id}|${issuedAt}|${dutyPaise}|${digest}`).digest("hex").slice(0, 32);

  return NextResponse.json({
    certificate: { id, issuedAt, signature, dutyPaise, itemCount: items.length, qr: `NYAYASEEMA|${id}|${digest}|${signature}` },
  });
}
