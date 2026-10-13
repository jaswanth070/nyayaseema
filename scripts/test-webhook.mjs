// End-to-end check of order creation + webhook handling against a running server.
//   npm run build && npm start   (in another terminal)
//   npm run test:webhook
// Uses RAZORPAY_WEBHOOK_SECRET if set, otherwise the mock-mode default secret.
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "nyayaseema_mock_webhook_secret";
let failed = 0;

const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${extra}`}`);
  if (!cond) failed++;
};

const sign = (raw) => crypto.createHmac("sha256", SECRET).update(raw).digest("hex");

async function webhook(event, order, { id = crypto.randomUUID(), amount = order.amount, signature } = {}) {
  const raw = JSON.stringify({
    entity: "event",
    event,
    payload: { payment: { entity: { id: "pay_test_" + id.slice(0, 8), order_id: order.id, amount, currency: "INR", status: event === "payment.failed" ? "failed" : "captured", method: "upi" } } },
  });
  const res = await fetch(`${BASE}/api/razorpay/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Razorpay-Signature": signature ?? sign(raw), "X-Razorpay-Event-Id": id },
    body: raw,
  });
  return { status: res.status, body: await res.json() };
}

const status = async (id) => (await (await fetch(`${BASE}/api/orders/${id}`)).json());

async function newOrder(body) {
  const res = await fetch(`${BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
}

// 1. server-side pricing
const bad = await newOrder({ flow: "odr", customer: { name: "T" } });
check("order without lawyer is rejected", bad.status === 400, JSON.stringify(bad.json));
const scan = await newOrder({
  flow: "scanner",
  customer: { name: "Test Traveller" },
  declaration: { gender: "male", stay: "3d-6m", items: [{ id: "a", description: "Phone", category: "electronics", amount: 3199, currency: "AED", quantity: 1 }] },
});
check("scanner order created", scan.status === 200 && scan.json.order.status === "created", JSON.stringify(scan.json));
const o = scan.json.order;
// 3199 AED * 22.7 = 72,617.3 -> 72,617; minus 50,000 -> 22,617 * 38.5% = 8,707.55 duty ; + 299 fee
check("amount computed on the server (₹299 + duty)", o.amount === 29900 + 870755, String(o.amount));

// 2. webhook security
const noSig = await webhook("payment.captured", o, { signature: "deadbeef" });
check("bad signature rejected (400)", noSig.status === 400);
check("order still unpaid after bad signature", (await status(o.id)).order.status === "created");

const wrongAmt = await webhook("payment.captured", o, { amount: 100 });
check("amount mismatch is not marked paid", wrongAmt.body.result === "amount_mismatch" && (await status(o.id)).order.status === "created");

// 3. happy path + idempotency
const evtId = "evt_" + crypto.randomUUID();
const ok1 = await webhook("payment.captured", o, { id: evtId });
check("payment.captured marks order paid", ok1.status === 200 && (await status(o.id)).order.status === "paid");
const dup = await webhook("payment.captured", o, { id: evtId });
check("duplicate event id is ignored", dup.body.result === "duplicate");
const after = await status(o.id);
check("certificate issued after payment", !!after.certificate?.id && after.certificate.qr.includes(after.certificate.signature));
check("ICEGATE reference recorded (simulated)", after.order.icegate?.status === "SIMULATED");

// 4. a late failure must not downgrade a paid order
await webhook("payment.failed", o);
check("paid order is terminal", (await status(o.id)).order.status === "paid");

// 5. failed -> retry -> paid
const odr = await newOrder({ flow: "odr", lawyerId: "lw-001", customer: { name: "Test" } });
const o2 = odr.json.order;
await webhook("payment.failed", o2);
check("payment.failed marks order failed", (await status(o2.id)).order.status === "failed");
await webhook("payment.captured", o2);
check("retry after failure can still succeed", (await status(o2.id)).order.status === "paid");

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
