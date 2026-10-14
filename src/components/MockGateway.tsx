"use client";

import { useState } from "react";
import { formatINR } from "@/lib/catalog";

export interface PaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Stand-in for Razorpay Checkout while no API keys are configured. */
export function MockGateway({
  amount,
  orderToken,
  onSuccess,
  onClose,
}: {
  amount: number;
  orderToken: string;
  onSuccess: (r: PaymentResponse) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"success" | "failure" | null>(null);
  const [err, setErr] = useState("");

  const pay = async (outcome: "success" | "failure") => {
    setBusy(outcome);
    setErr("");
    const res = await fetch("/api/mock/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderToken, outcome }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (res?.ok) return onSuccess(json as PaymentResponse);
    setErr(json?.error ?? "Demo gateway error");
    setBusy(null);
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Demo payment gateway">
      <div className="modal">
        <div className="modal-head">
          <div className="small" style={{ color: "var(--gold)", fontWeight: 700, letterSpacing: ".1em" }}>DEMO GATEWAY</div>
          <div className="serif" style={{ fontSize: "1.3rem", fontWeight: 700 }}>NyayaSeema</div>
        </div>
        <div className="modal-body">
          <div className="row spread">
            <span className="muted">Amount Payable</span>
            <strong className="serif num" style={{ fontSize: "1.5rem", color: "var(--navy)" }}>{formatINR(amount)}</strong>
          </div>
          <p className="notice small">
            No Razorpay keys are configured, so this simulated gateway stands in for Razorpay Checkout. It returns a
            signed payment result that the server verifies, exactly as it would for Razorpay. No real payment is made.
          </p>
          {err && <p className="error-text" role="alert">{err}</p>}
          <button className="btn gold" disabled={!!busy} onClick={() => pay("success")}>
            {busy === "success" ? "Processing…" : "Pay With UPI (Simulate Success)"}
          </button>
          <button className="btn ghost" disabled={!!busy} onClick={() => pay("failure")}>
            {busy === "failure" ? "Processing…" : "Simulate Failed Payment"}
          </button>
          <button className="btn ghost sm" disabled={!!busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
