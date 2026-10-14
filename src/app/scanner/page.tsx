"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FLOWS, formatINR, type LineItem } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { FLAT_DUTY_RATE, calculateDuty } from "@/lib/duty";
import { PageHead, Stepper, useGuard } from "@/components/Ui";

// Demo extraction: the Stage-2 vision model will replace these sample items.
const SAMPLE_EXTRACTIONS: Omit<LineItem, "id">[] = [
  { description: "Smartphone 256GB", category: "electronics", amount: 3199, currency: "AED", quantity: 1 },
  { description: "Gold chain 22K", category: "gold", amount: 3400, currency: "AED", quantity: 1, grams: 18 },
  { description: "Perfume gift set", category: "gift", amount: 450, currency: "AED", quantity: 2 },
];

interface Certificate { id: string; issuedAt: string; signature: string; dutyPaise: number; itemCount: number; qr: string }

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function ScannerFlow() {
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const items = state.declaration.items;
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scanCount = useRef(0);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  if (!ok) return null;

  const setItems = (next: LineItem[]) => update({ declaration: { ...state.declaration, items: next } });

  const onScan = (file: File | undefined) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    window.setTimeout(() => {
      const sample = SAMPLE_EXTRACTIONS[scanCount.current++ % SAMPLE_EXTRACTIONS.length];
      setItems([...items, { ...sample, id: uid() }]);
      setScanning(false);
    }, 1600);
  };

  const issuePass = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/scan/pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not issue the pass");
      setCert(json.certificate);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const result = step === 1 ? calculateDuty(state.declaration) : null;

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.scanner.title} lead={FLOWS.scanner.tagline} />
      <Stepper steps={FLOWS.scanner.steps} current={step} />

      {step === 0 && (
        <div className="stack">
          <div className="card blue">
            <h2>Scan your receipts</h2>
            <p className="muted small" style={{ margin: "6px 0 16px" }}>
              Take a photo of each paper receipt or upload one. Items, prices and currency are read automatically — nothing to type.
            </p>
            <div className="scanner" aria-live="polite">
              {preview && <img className="preview" src={preview} alt="Receipt preview" />}
              {scanning && (<><div className="frame" /><div className="beam" /></>)}
              <div style={{ position: "relative" }}>
                <strong style={{ fontSize: "1.1rem" }}>{scanning ? "Reading receipt…" : "Ready to scan"}</strong>
                <div style={{ opacity: 0.85, margin: "6px 0 16px", fontSize: "0.9rem" }}>
                  {scanning ? "Extracting items, prices and currency" : "Camera capture on mobile · file upload on desktop"}
                </div>
                <label className="btn gold" style={{ cursor: scanning ? "wait" : "pointer", opacity: scanning ? 0.6 : 1 }}>
                  {scanning ? "Scanning…" : items.length ? "Scan another receipt" : "Open scanner / upload receipt"}
                  <input type="file" accept="image/*" capture="environment" disabled={scanning} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                    onChange={(e) => { onScan(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <p className="notice" style={{ marginTop: 14 }}>
              <strong>Demo extraction.</strong> This POC does not run a vision model yet — each scan adds a sample item.
            </p>
          </div>

          {items.length > 0 && (
            <div className="card">
              <h2>Scanned items ({items.length})</h2>
              <ul className="filelist" style={{ marginTop: 12 }}>
                {items.map((i) => (
                  <li key={i.id}>
                    <span>{i.description} <span className="muted small">× {i.quantity} · {i.amount} {i.currency}{i.grams ? ` · ${i.grams} g` : ""}</span></span>
                    <button type="button" onClick={() => setItems(items.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.description}`}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/services" className="btn ghost">← Back</Link>
            <button className="btn gold" disabled={items.length === 0 || scanning} onClick={() => setStep(1)}>See estimated duty →</button>
          </div>
        </div>
      )}

      {step === 1 && result && (
        <div className="stack">
          <div className="card blue">
            <h2>Estimated duty</h2>
            <div className="tablewrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Item</th><th className="r">Value (INR)</th></tr></thead>
                <tbody>
                  {result.pricedItems.map((i) => (
                    <tr key={i.id}><td>{i.description} <span className="muted small">× {i.quantity} · {i.category}</span></td><td className="r num">{formatINR(i.inr * 100)}</td></tr>
                  ))}
                  <tr><td><strong>Total value</strong></td><td className="r num"><strong>{formatINR(result.totalValue * 100)}</strong></td></tr>
                </tbody>
              </table>
            </div>
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>Free allowance</dt><dd className="num">{formatINR(result.generalAllowance * 100)}</dd>
              <dt>Dutiable value</dt><dd className="num">{formatINR(result.totalDutiable * 100)}</dd>
              <dt>Duty @ {(FLAT_DUTY_RATE * 100).toFixed(1)}%</dt><dd className="num">{formatINR(Math.round(result.duty * 100))}</dd>
            </dl>
            {result.commercialFlags.length > 0 ? (
              <div className="notice err" style={{ marginTop: 14 }}>
                <strong>Commercial-capacity check:</strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{result.commercialFlags.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ) : (
              <div className="notice ok" style={{ marginTop: 14 }}>Commercial-capacity check passed: quantities look like personal use.</div>
            )}
            <p className="muted small" style={{ marginTop: 12 }}>
              Estimate assumes a stay abroad of 3 days to 6 months, so only the standard allowance applies (no gold concession). Rates are illustrative for this POC.
            </p>
          </div>
          {error && <p className="notice err" role="alert">{error}</p>}
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => setStep(0)}>← Scan more</button>
            <button className="btn gold lg" disabled={busy} onClick={issuePass}>{busy ? "Issuing…" : "Get my CustomsQR pass →"}</button>
          </div>
        </div>
      )}

      {step === 2 && cert && (
        <div className="stack">
          <div className="cert">
            <div className="cert-head">
              <span className="serif">CustomsQR Declaration Pass</span>
              <span className="pill gold">Free</span>
            </div>
            <div className="cert-body">
              <dl className="kv">
                <dt>Certificate ID</dt><dd>{cert.id}</dd>
                <dt>Items scanned</dt><dd>{cert.itemCount}</dd>
                <dt>Estimated duty</dt><dd className="num">{formatINR(cert.dutyPaise)}</dd>
                <dt>Issued</dt><dd>{fmt(cert.issuedAt)}</dd>
                <dt>Signature</dt><dd className="small" style={{ fontFamily: "ui-monospace, monospace" }}>{cert.signature}</dd>
              </dl>
              <div className="qr-box"><QRCodeSVG value={cert.qr} size={150} fgColor="#12152b" /></div>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/services" className="btn ghost">Use another service</Link>
            <Link href="/" className="btn gold" onClick={() => update({ declaration: { ...state.declaration, items: [] } })}>Finish</Link>
          </div>
        </div>
      )}
    </div>
  );
}
