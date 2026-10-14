"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FLOWS, formatINR, type LineItem } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { FLAT_DUTY_RATE, calculateDuty } from "@/lib/duty";
import { PageHead, Stepper, useGuard } from "@/components/Ui";

// Demo extraction: a product-recognition / barcode model will replace these sample items.
const SAMPLE_ITEMS: Omit<LineItem, "id">[] = [
  { description: "Smartphone 256GB", category: "electronics", amount: 3199, currency: "AED", quantity: 1 },
  { description: "Gold chain 22K", category: "gold", amount: 3400, currency: "AED", quantity: 1, grams: 18 },
  { description: "Perfume gift set", category: "gift", amount: 450, currency: "AED", quantity: 2 },
];

// Illustrative customs notes per category (POC copy, not legal advice).
const CUSTOMS_INFO: Record<LineItem["category"], string> = {
  electronics: "Counts towards the free baggage allowance; above it, duty applies. Keep the invoice and stay within personal-use quantities.",
  gold: "Assessed by weight and purity. Any concession depends on stay abroad and gender, and is not applied in this estimate.",
  "alcohol-tobacco": "Subject to personal-use quantity limits; amounts above them may be treated as commercial.",
  gift: "Gifts count towards the free baggage allowance like other personal goods.",
  general: "Counts towards the free baggage allowance; above it, duty applies.",
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function ScannerFlow() {
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const items = state.declaration.items;
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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
      const sample = SAMPLE_ITEMS[scanCount.current++ % SAMPLE_ITEMS.length];
      setItems([...items, { ...sample, id: uid() }]);
      setScanning(false);
    }, 1600);
  };

  const result = step === 1 ? calculateDuty(state.declaration) : null;
  const categories = result ? Array.from(new Set(result.pricedItems.map((i) => i.category))) : [];

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.scanner.title} lead={FLOWS.scanner.tagline} />
      <Stepper steps={FLOWS.scanner.steps} current={step} />

      {step === 0 && (
        <div className="stack">
          <div className="card blue">
            <h2>Scan your item</h2>
            <p className="muted small" style={{ margin: "6px 0 16px" }}>
              Point your camera at the product or its barcode, or upload a photo. The item and its price are read automatically — nothing to type.
            </p>
            <div className="scanner" aria-live="polite">
              {preview && <img className="preview" src={preview} alt="Scanned item preview" />}
              {scanning && (<><div className="frame" /><div className="beam" /></>)}
              <div style={{ position: "relative" }}>
                <strong style={{ fontSize: "1.1rem" }}>{scanning ? "Identifying item…" : "Ready to scan"}</strong>
                <div style={{ opacity: 0.85, margin: "6px 0 16px", fontSize: "0.9rem" }}>
                  {scanning ? "Reading product details and price" : "Camera capture on mobile · file upload on desktop"}
                </div>
                <label className="btn gold" style={{ cursor: scanning ? "wait" : "pointer", opacity: scanning ? 0.6 : 1 }}>
                  {scanning ? "Scanning…" : items.length ? "Scan another item" : "Open scanner / upload photo"}
                  <input type="file" accept="image/*" capture="environment" disabled={scanning} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                    onChange={(e) => { onScan(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <p className="notice" style={{ marginTop: 14 }}>
              <strong>Demo extraction.</strong> This POC does not run a recognition model yet — each scan adds a sample item.
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
            <button className="btn gold" disabled={items.length === 0 || scanning} onClick={() => setStep(1)}>See duty summary →</button>
          </div>
        </div>
      )}

      {step === 1 && result && (
        <div className="stack">
          <div className="card blue">
            <h2>Duty summary</h2>
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
            <dl className="kv" style={{ marginTop: 16, gridTemplateColumns: "210px 1fr" }}>
              <dt>Free allowance</dt><dd className="num">{formatINR(result.generalAllowance * 100)}</dd>
              <dt>Dutiable value</dt><dd className="num">{formatINR(result.totalDutiable * 100)}</dd>
              <dt>Estimated duty @ {(FLAT_DUTY_RATE * 100).toFixed(1)}%</dt><dd className="num"><strong>{formatINR(Math.round(result.duty * 100))}</strong></dd>
            </dl>
          </div>

          <div className="card">
            <h2>Relevant customs information</h2>
            <ul style={{ margin: "12px 0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map((c) => <li key={c}><strong style={{ textTransform: "capitalize" }}>{c.replace("-", " & ")}:</strong> {CUSTOMS_INFO[c]}</li>)}
            </ul>
            {result.commercialFlags.length > 0 ? (
              <div className="notice err" style={{ marginTop: 14 }}>
                <strong>Quantity check:</strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{result.commercialFlags.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ) : (
              <div className="notice ok" style={{ marginTop: 14 }}>Quantity check passed: items look like personal use.</div>
            )}
            <p className="muted small" style={{ marginTop: 12 }}>
              Estimate assumes a stay abroad of 3 days to 6 months, so only the standard allowance applies. Rates are illustrative for this POC and are not legal advice.
            </p>
          </div>

          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => setStep(0)}>← Scan more</button>
            <Link href="/services" className="btn gold" onClick={() => setItems([])}>Done</Link>
          </div>
        </div>
      )}
    </div>
  );
}
