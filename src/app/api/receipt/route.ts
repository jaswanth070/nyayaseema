import { NextResponse } from "next/server";
import type { Receipt } from "@/lib/order";
import { readToken } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifies a receipt token and returns its contents.
export async function GET(req: Request) {
  const claim = readToken<{ t: string; receipt: Receipt }>(new URL(req.url).searchParams.get("t"));
  if (!claim || claim.t !== "receipt") return NextResponse.json({ error: "Invalid or tampered receipt" }, { status: 400 });
  const { receipt } = claim;

  return NextResponse.json({ receipt });
}
