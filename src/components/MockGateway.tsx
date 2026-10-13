"use client";

import { useState } from "react";
import { formatINR } from "@/lib/catalog";

/** Stand-in for Razorpay Checkout while no API keys are configured. */
export function MockGateway({
  amount,
  orderId,
  onDone,
  onClose,
}: {
  amount: number;
  orderId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"success" | "failure" | null>(null);
  const [err, setErr] = useState("");

  const pay = async (outcome: "success" | "failure") => {
    setBusy(outcome);
    setErr("");
    try {
      const res = await fetch("/api/mock/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, outcome }),
      });
      if (!res.ok) throw new Error("Demo gateway error");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
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
            <span className="muted">Amount payable</span>
            <strong className="serif num" style={{ fontSize: "1.5rem", color: "var(--navy)" }}>{formatINR(amount)}</strong>
          </div>
          <p className="notice small">
            No Razorpay keys are configured, so this simulated gateway stands in for Razorpay Checkout. It sends a signed
            webhook to <code>/api/razorpay/webhook</code>, exactly as Razorpay would. No real payment is made.
          </p>
          {err && <p className="error-text" role="alert">{err}</p>}
          <button className="btn gold" disabled={!!busy} onClick={() => pay("success")}>
            {busy === "success" ? "Processing…" : "Pay with UPI (simulate success)"}
          </button>
          <button className="btn ghost" disabled={!!busy} onClick={() => pay("failure")}>
            {busy === "failure" ? "Processing…" : "Simulate failed payment"}
          </button>
          <button className="btn ghost sm" disabled={!!busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
