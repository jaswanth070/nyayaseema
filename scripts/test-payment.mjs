// Checks order creation + server-side payment verification against a running server (demo mode).
//   npm run build && npm start     (no Razorpay keys in env)
//   npm run test:payment
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failed = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${extra}`}`);
  if (!cond) failed++;
};
const post = async (path, body) => {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
};

const none = await post("/api/orders", { flow: "odr", customer: { name: "T" } });
check("order without lawyer is rejected", none.status === 400, JSON.stringify(none.json));

const noScanner = await post("/api/orders", { flow: "scanner", customer: { name: "T" } });
check("scanner is free: it cannot be ordered", noScanner.status === 400, JSON.stringify(noScanner.json));

// lw-001 legal assistance: ₹399 platform + ₹799 lawyer + ₹8,707.55 duty entered by the passenger
const scan = await post("/api/orders", { flow: "legal", lawyerId: "lw-001", estimatedDuty: 8707.55, customer: { name: "Test Traveller" } });
check("legal order created", scan.status === 200 && !!scan.json.orderToken, JSON.stringify(scan.json));
check("amount computed on the server", scan.json.order.amount === 39900 + 79900 + 870755, String(scan.json.order.amount));
const { orderToken, order } = scan.json;

const pay = await post("/api/mock/pay", { orderToken, outcome: "success" });
check("demo gateway returns a signed payment", pay.status === 200 && !!pay.json.razorpay_signature);
const failedPay = await post("/api/mock/pay", { orderToken, outcome: "failure" });
check("declined payment returns 402", failedPay.status === 402);

const bad = await post("/api/payments/verify", { orderToken, ...pay.json, razorpay_signature: "0".repeat(64) });
check("forged signature rejected", bad.status === 400);
const otherPay = `pay_${crypto.randomBytes(6).toString("hex")}`;
const swapped = await post("/api/payments/verify", { orderToken, ...pay.json, razorpay_payment_id: otherPay });
check("signature bound to payment id", swapped.status === 400);
const tampered = await post("/api/payments/verify", { orderToken: orderToken.replace(/^./, (c) => (c === "A" ? "B" : "A")), ...pay.json });
check("tampered order token rejected", tampered.status === 400);
const other = await post("/api/orders", { flow: "odr", lawyerId: "lw-001", customer: { name: "Other" } });
const wrongOrder = await post("/api/payments/verify", { orderToken: other.json.orderToken, ...pay.json });
check("payment for a different order rejected", wrongOrder.status === 400);

const ok = await post("/api/payments/verify", { orderToken, ...pay.json });
check("valid payment verifies and returns receipt token", ok.status === 200 && !!ok.json.receiptToken, JSON.stringify(ok.json));

const rec = await (await fetch(`${BASE}/api/receipt?t=${encodeURIComponent(ok.json.receiptToken)}`)).json();
check("receipt matches order and payment", rec.receipt?.order.id === order.id && rec.receipt.paymentId === pay.json.razorpay_payment_id);
check("ICEGATE reference recorded (simulated)", rec.receipt?.icegate?.status === "SIMULATED");
const forged = await fetch(`${BASE}/api/receipt?t=${encodeURIComponent(ok.json.receiptToken.slice(0, -3) + "AAA")}`);
check("altered receipt token rejected", forged.status === 400);

// free receipt scanner: signed pass, no payment
const item = { id: "a", description: "Phone", category: "electronics", amount: 3199, currency: "AED", quantity: 1 };
const sp = await post("/api/scan/pass", { items: [item] });
// 3199 AED * 22.7 = 72,617; minus 50,000 -> 22,617 * 38.5% = 8,707.55
check("scan pass issued without payment", sp.status === 200 && sp.json.certificate.dutyPaise === 870755 && sp.json.certificate.qr.includes(sp.json.certificate.signature), JSON.stringify(sp.json));
check("scan pass rejects empty scan", (await post("/api/scan/pass", { items: [] })).status === 400);

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
