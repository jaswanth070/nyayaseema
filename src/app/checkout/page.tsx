"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FLOWS, JURISDICTIONS, formatINR, lawyerById } from "@/lib/catalog";
import { useCase, type CaseState } from "@/lib/case";
import { quote, type QuoteInput } from "@/lib/pricing";
import { MockGateway, type PaymentResponse } from "@/components/MockGateway";
import { PageHead, Stepper, useGuard } from "@/components/Ui";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (evt: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function buildRequest(s: CaseState): { quote: QuoteInput; customer: { name: string; email: string; phone: string } } | null {
  switch (s.flow) {
    case "legal":
      return {
        quote: { flow: "legal", lawyerId: s.lawyerId, estimatedDuty: s.legal.estimatedDuty },
        customer: { name: s.legal.fullName, email: s.legal.email, phone: s.legal.phone },
      };
    case "odr":
      return {
        quote: { flow: "odr", lawyerId: s.lawyerId },
        customer: { name: s.dispute.fullName, email: s.dispute.email, phone: s.dispute.phone },
      };
    case "offline":
      return {
        quote: { flow: "offline", lawyerId: s.lawyerId, jurisdictionId: s.jurisdictionId },
        customer: { name: s.offline.fullName, email: s.offline.email, phone: s.offline.phone },
      };
    default:
      return null;
  }
}

export default function Checkout() {
  const router = useRouter();
  const ok = useGuard(["arrival", "category", "flow"]);
  const { state } = useCase();
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [mock, setMock] = useState<{ orderToken: string; amount: number } | null>(null);
  const pending = useRef<{ orderId: string; orderToken: string; keyId: string | null; amount: number; key: string } | null>(null);

  const req = useMemo(() => (ok ? buildRequest(state) : null), [ok, state]);
  const q = useMemo(() => (req ? quote(req.quote) : null), [req]);
  if (!ok || !req || !state.flow || state.flow === "scanner") return null;
  const flow = FLOWS[state.flow];
  const stepIndex = flow.steps.findIndex((s) => /payment/i.test(s));
  const lawyer = lawyerById(state.lawyerId);
  const jur = JURISDICTIONS.find((j) => j.id === state.jurisdictionId);

  // No webhook: the signature Razorpay returns to the browser is verified server-side before we trust it.
  const confirm = async (orderToken: string, r: PaymentResponse) => {
    setMock(null);
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderToken, ...r }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Payment could not be verified");
      pending.current = null;
      router.push(`/receipt?t=${encodeURIComponent(json.receiptToken)}`);
    } catch (e) {
      setError(`${(e as Error).message}. If money was debited, contact support with payment ID ${r.razorpay_payment_id}.`);
      setVerifying(false);
    }
  };

  const pay = async () => {
    if (!q || "error" in q) return;
    setBusy(true);
    setError("");
    try {
      // Reuse the order when retrying the same basket so a user cannot create duplicate orders.
      const key = JSON.stringify([req.quote, req.customer]);
      let o = pending.current?.key === key ? pending.current : null;
      if (!o) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...req.quote, customer: req.customer }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not start payment");
        o = { orderId: json.order.id, orderToken: json.orderToken, keyId: json.keyId, amount: json.order.amount, key };
        pending.current = o;
      }

      if (!o.keyId) {
        setMock({ orderToken: o.orderToken, amount: o.amount });
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load Razorpay Checkout. Check your connection.");
      const orderId = o.orderId;
      const rzp = new window.Razorpay({
        key: o.keyId,
        amount: o.amount,
        currency: "INR",
        name: "NyayaSeema",
        description: flow.title,
        order_id: orderId,
        prefill: { name: req.customer.name, email: req.customer.email, contact: req.customer.phone },
        theme: { color: "#12152b" },
        handler: (r: PaymentResponse) => void confirm(o.orderToken, r),
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => setError("Payment failed. You can retry with another method."));
      rzp.open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap page">
      <PageHead title="Review and pay" lead="Payments are processed by Razorpay. Your order is confirmed once the server verifies the payment signature." />
      <Stepper steps={flow.steps} current={Math.max(stepIndex, 0)} />

      <div className="grid two" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}>
        <div className="card blue">
          <h2>{flow.title}</h2>
          <p className="muted small" style={{ margin: "4px 0 14px" }}>
            {req.customer.name}
            {lawyer ? ` · ${lawyer.name}` : ""}
            {jur ? ` · ${jur.airport} (${jur.code})` : ""}
          </p>
          {q && "error" in q ? (
            <p className="notice err">{q.error}. <Link href={flow.href}>Go back</Link></p>
          ) : (
            q && (
              <div className="tablewrap">
                <table className="table">
                  <tbody>
                    {q.lines.map((l) => (
                      <tr key={l.label}><td>{l.label}</td><td className="r num">{formatINR(l.amount)}</td></tr>
                    ))}
                    <tr className="total-row"><td>Total</td><td className="r num">{formatINR(q.total)}</td></tr>
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div className="card navy stack" style={{ alignSelf: "start" }}>
          <h2>Secure payment</h2>
          <p className="small" style={{ opacity: 0.85 }}>UPI, cards, netbanking and wallets via Razorpay.</p>
          {error && <p className="notice err" role="alert">{error}</p>}
          <button className="btn gold lg" disabled={busy || verifying || !q || "error" in q} onClick={pay}>
            {verifying ? <><span className="spinner" /> Verifying payment…</> : busy ? <><span className="spinner" /> Starting…</> : q && !("error" in q) ? `Pay ${formatINR(q.total)}` : "Pay"}
          </button>
          <Link href={flow.href} className="btn ghost on-dark">← Edit details</Link>
        </div>
      </div>

      {mock && (
        <MockGateway
          amount={mock.amount}
          orderToken={mock.orderToken}
          onClose={() => setMock(null)}
          onSuccess={(r) => void confirm(mock.orderToken, r)}
        />
      )}
    </div>
  );
}
