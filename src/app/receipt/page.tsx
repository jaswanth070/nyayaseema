"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { FLOWS, JURISDICTIONS, formatINR, lawyerById } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import type { Receipt } from "@/lib/order";
import { PageHead } from "@/components/Ui";

interface Certificate { id: string; issuedAt: string; signature: string; qr: string }

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

function ReceiptView() {
  const token = useSearchParams().get("t");
  const { reset } = useCase();
  const [data, setData] = useState<{ receipt: Receipt; certificate: Certificate | null } | null>(null);
  const [invalid, setInvalid] = useState(false);

  // The receipt is a server-signed token, so this link stays verifiable and cannot be forged or edited.
  useEffect(() => {
    if (!token) return setInvalid(true);
    fetch(`/api/receipt?t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setInvalid(true));
  }, [token]);

  if (invalid) {
    return (
      <div className="wrap page">
        <PageHead title="Receipt not found" lead="This receipt link is missing, incomplete or has been altered." />
        <Link href="/services" className="btn gold">Back to services</Link>
      </div>
    );
  }
  if (!data) return <div className="wrap page"><p className="row"><span className="spinner" /> Verifying your receipt…</p></div>;

  const { receipt, certificate } = data;
  const { order } = receipt;
  const lawyer = lawyerById(order.lawyerId);
  const jur = JURISDICTIONS.find((j) => j.id === order.jurisdictionId);

  const headline: Record<string, { title: string; lead: string }> = {
    scanner: { title: "Your CustomsQR pass is ready", lead: "Present this digital certificate at the airport green-channel e-kiosk." },
    legal: { title: "Lawyer connected — declaration in progress", lead: `${lawyer?.name ?? "Your lawyer"} has your documents and will finalise the declaration.` },
    odr: { title: "Your lawyer is ready", lead: `${lawyer?.name ?? "Your lawyer"} has been notified and your ODR case workspace is open.` },
    offline: { title: "Lawyer assigned", lead: `${lawyer?.name ?? "Your lawyer"} will represent you at ${jur?.airport ?? "the"} customs jurisdiction.` },
  };
  const timeline: Record<string, string[]> = {
    scanner: ["Payment received", "Duty remitted to ICEGATE", "CustomsQR pass issued"],
    legal: ["Payment received", "Lawyer connected", "Duty remitted to ICEGATE"],
    odr: ["Payment received", "Lawyer notified", "Lawyer ready — ODR session open"],
    offline: ["Payment received", "Lawyer assigned", "Appearance scheduled with you by lawyer"],
  };
  // Steps already complete once the payment is verified (ICEGATE remittance is simulated).
  const doneCount: Record<string, number> = { scanner: 3, legal: 3, odr: 3, offline: 2 };

  return (
    <div className="wrap page">
      <div className="notice ok" role="status" style={{ marginBottom: 20 }}>✓ Payment verified {order.mode === "mock" && "(demo gateway)"}</div>
      <PageHead title={headline[order.flow].title} lead={headline[order.flow].lead} />

      <div className="stack">
        {certificate && (
          <div className="cert">
            <div className="cert-head">
              <span className="serif">CustomsQR Declaration Pass</span>
              <span className="pill gold">Green Channel</span>
            </div>
            <div className="cert-body">
              <dl className="kv">
                <dt>Certificate ID</dt><dd>{certificate.id}</dd>
                <dt>Passenger</dt><dd>{order.customer.name}</dd>
                <dt>Issued</dt><dd>{fmt(certificate.issuedAt)}</dd>
                <dt>Duty paid</dt><dd className="num">{formatINR(order.lines.find((l) => l.kind === "duty")?.amount ?? 0)}</dd>
                <dt>Signature</dt><dd className="small" style={{ fontFamily: "ui-monospace, monospace" }}>{certificate.signature}</dd>
              </dl>
              <div className="qr-box"><QRCodeSVG value={certificate.qr} size={150} fgColor="#12152b" /></div>
            </div>
          </div>
        )}

        <div className="grid two">
          <div className="card blue">
            <h2>What happens next</h2>
            <ul className="timeline" style={{ marginTop: 16 }}>
              {timeline[order.flow].map((t, i) => (
                <li key={t} className={i < doneCount[order.flow] ? "done" : i === doneCount[order.flow] ? "now" : ""}>
                  <span className="dot">{i < doneCount[order.flow] ? "✓" : i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {lawyer && (
              <div className="row" style={{ marginTop: 18 }}>
                <span className="avatar">{lawyer.initials}</span>
                <div><strong>{lawyer.name}</strong><div className="muted small">{lawyer.headline}</div></div>
              </div>
            )}
            {receipt.icegate && (
              <p className="notice small" style={{ marginTop: 16 }}>
                <strong>ICEGATE remittance (simulated):</strong> {receipt.icegate.reference} · {formatINR(receipt.icegate.amountPaise)}.
                Real remittance needs an ICEGATE-authorised payment channel.
              </p>
            )}
          </div>

          <div className="card">
            <h2>Receipt</h2>
            <div className="tablewrap" style={{ marginTop: 10 }}>
              <table className="table">
                <tbody>
                  {order.lines.map((l) => <tr key={l.label}><td>{l.label}</td><td className="r num">{formatINR(l.amount)}</td></tr>)}
                  <tr className="total-row"><td>Total paid</td><td className="r num">{formatINR(order.amount)}</td></tr>
                </tbody>
              </table>
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Service</dt><dd>{FLOWS[order.flow].title}</dd>
              <dt>Receipt no.</dt><dd>{order.receipt}</dd>
              <dt>Order ID</dt><dd className="small">{order.id}</dd>
              <dt>Payment ID</dt><dd className="small">{receipt.paymentId}</dd>
              <dt>Paid at</dt><dd>{fmt(receipt.paidAt)}</dd>
            </dl>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/services" className="btn ghost">Use another service</Link>
          <Link href="/" className="btn gold" onClick={reset}>Finish</Link>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="wrap page"><p className="row"><span className="spinner" /> Loading…</p></div>}>
      <ReceiptView />
    </Suspense>
  );
}
