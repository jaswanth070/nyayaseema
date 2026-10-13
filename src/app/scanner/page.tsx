"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FLOWS, STAY_LABELS, formatINR, type Gender, type LineItem, type StayBand } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { CURRENCIES, FLAT_DUTY_RATE, calculateDuty } from "@/lib/duty";
import { Field, PageHead, Stepper, useGuard } from "@/components/Ui";

const SAMPLE_EXTRACTIONS: Omit<LineItem, "id">[] = [
  { description: "Smartphone 256GB", category: "electronics", amount: 3199, currency: "AED", quantity: 1 },
  { description: "Gold chain 22K", category: "gold", amount: 3400, currency: "AED", quantity: 1, grams: 18 },
  { description: "Perfume gift set", category: "gift", amount: 450, currency: "AED", quantity: 2 },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const CATEGORIES: LineItem["category"][] = ["general", "electronics", "gold", "alcohol-tobacco", "gift"];

export default function ScannerFlow() {
  const router = useRouter();
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const d = state.declaration;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const scanCount = useRef(0);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  if (!ok) return null;

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => update({ declaration: { ...d, [k]: v } });
  const setItems = (items: LineItem[]) => update({ declaration: { ...d, items } });

  const nextFromProfile = () => {
    if (!d.passengerName.trim() || !d.passportNo.trim() || !d.flightNo.trim() || !d.arrivingFrom.trim()) {
      setError("Please complete name, passport number, flight number and the country you are arriving from.");
      return;
    }
    setError("");
    setStep(1);
  };

  const onScan = (file: File | undefined) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    // Demo OCR: the real Stage-2 vision model will replace this sample extraction.
    window.setTimeout(() => {
      const sample = SAMPLE_EXTRACTIONS[scanCount.current % SAMPLE_EXTRACTIONS.length];
      scanCount.current += 1;
      setItems([...d.items, { ...sample, id: uid() }]);
      setScanning(false);
    }, 1600);
  };

  const patchItem = (id: string, patch: Partial<LineItem>) =>
    setItems(d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const nextFromScan = () => {
    if (d.items.length === 0) return setError("Scan a receipt or add at least one item.");
    if (d.items.some((i) => !i.description.trim() || !(i.amount > 0) || !(i.quantity >= 1)))
      return setError("Each item needs a description, a price above zero and a quantity of at least 1.");
    setError("");
    setStep(2);
  };

  const result = step === 2 ? calculateDuty(d) : null;

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.scanner.title} lead={FLOWS.scanner.tagline} />
      <Stepper steps={FLOWS.scanner.steps} current={step} />

      {step === 0 && (
        <div className="card blue">
          <h2>Passenger profile</h2>
          <p className="muted small" style={{ margin: "6px 0 18px" }}>
            Stay duration and gender determine your statutory allowances (including gold limits).
          </p>
          <div className="form-grid">
            <Field label="Full name (as on passport)"><input className="input" value={d.passengerName} onChange={(e) => set("passengerName", e.target.value)} autoComplete="name" /></Field>
            <Field label="Passport number"><input className="input" value={d.passportNo} onChange={(e) => set("passportNo", e.target.value.toUpperCase())} /></Field>
            <Field label="Flight number"><input className="input" value={d.flightNo} placeholder="AI 906" onChange={(e) => set("flightNo", e.target.value.toUpperCase())} /></Field>
            <Field label="Arriving from (country)"><input className="input" value={d.arrivingFrom} placeholder="United Arab Emirates" onChange={(e) => set("arrivingFrom", e.target.value)} /></Field>
            <Field label="Length of stay abroad">
              <select className="input" value={d.stay} onChange={(e) => set("stay", e.target.value as StayBand)}>
                {(Object.keys(STAY_LABELS) as StayBand[]).map((k) => <option key={k} value={k}>{STAY_LABELS[k]}</option>)}
              </select>
            </Field>
            <Field label="Gender (for gold allowance)">
              <select className="input" value={d.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Email" hint="Used to prefill the payment form and send your pass."><input className="input" type="email" value={d.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
            <Field label="Mobile number"><input className="input" type="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
          </div>
          {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          <div className="actions">
            <Link href="/services" className="btn ghost">← Back</Link>
            <button className="btn gold" onClick={nextFromProfile}>Continue to scanner →</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <div className="card blue">
            <h2>Scan your receipts</h2>
            <p className="muted small" style={{ margin: "6px 0 16px" }}>
              Take a photo of a paper receipt or upload one. Review every extracted value before continuing.
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
                  {scanning ? "Scanning…" : "Open scanner / upload receipt"}
                  <input type="file" accept="image/*" capture="environment" disabled={scanning} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                    onChange={(e) => { onScan(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <p className="notice" style={{ marginTop: 14 }}>
              <strong>Demo extraction.</strong> This POC does not run a vision model yet — each scan adds a sample line item for you to edit.
            </p>
          </div>

          <div className="card">
            <div className="row spread" style={{ marginBottom: 12 }}>
              <h2>Items declared ({d.items.length})</h2>
              <button className="btn ghost sm" onClick={() => setItems([...d.items, { id: uid(), description: "", category: "general", amount: 0, currency: "AED", quantity: 1 }])}>+ Add item manually</button>
            </div>
            {d.items.length === 0 ? (
              <p className="muted">No items yet.</p>
            ) : (
              <div className="tablewrap">
                <table className="table">
                  <thead><tr><th>Description</th><th>Category</th><th>Price</th><th>Cur.</th><th>Qty</th><th>Grams</th><th /></tr></thead>
                  <tbody>
                    {d.items.map((i) => (
                      <tr key={i.id}>
                        <td><input className="input" aria-label="Description" value={i.description} onChange={(e) => patchItem(i.id, { description: e.target.value })} /></td>
                        <td><select className="input" aria-label="Category" value={i.category} onChange={(e) => patchItem(i.id, { category: e.target.value as LineItem["category"] })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                        <td><input className="input" aria-label="Price" type="number" min={0} style={{ minWidth: 90 }} value={i.amount || ""} onChange={(e) => patchItem(i.id, { amount: Number(e.target.value) })} /></td>
                        <td><select className="input cur" aria-label="Currency" value={i.currency} onChange={(e) => patchItem(i.id, { currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></td>
                        <td><input className="input" aria-label="Quantity" type="number" min={1} style={{ minWidth: 64 }} value={i.quantity} onChange={(e) => patchItem(i.id, { quantity: Math.max(1, Number(e.target.value)) })} /></td>
                        <td>{i.category === "gold" ? <input className="input" aria-label="Grams" type="number" min={0} style={{ minWidth: 70 }} value={i.grams ?? ""} onChange={(e) => patchItem(i.id, { grams: Number(e.target.value) })} /> : <span className="muted">—</span>}</td>
                        <td><button className="btn ghost sm" onClick={() => setItems(d.items.filter((x) => x.id !== i.id))} aria-label="Remove item">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
            <div className="actions">
              <button className="btn ghost" onClick={() => { setError(""); setStep(0); }}>← Back</button>
              <button className="btn gold" onClick={nextFromScan}>Calculate duty →</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && result && (
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
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>Free allowance</dt><dd className="num">{formatINR(result.generalAllowance * 100)} general{result.goldEligible ? ` + ${formatINR(result.goldFree * 100)} gold` : " (gold concession needs >1 yr abroad)"}</dd>
              <dt>Dutiable value</dt><dd className="num">{formatINR(result.totalDutiable * 100)}</dd>
              <dt>Duty @ {(FLAT_DUTY_RATE * 100).toFixed(1)}%</dt><dd className="num">{formatINR(Math.round(result.duty * 100))}</dd>
            </dl>
            {result.commercialFlags.length > 0 ? (
              <div className="notice err" style={{ marginTop: 14 }}>
                <strong>Commercial-capacity check:</strong>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{result.commercialFlags.map((f) => <li key={f}>{f}</li>)}</ul>
                <div style={{ marginTop: 8 }}>Consider a lawyer via ODR if customs disputes this.</div>
              </div>
            ) : (
              <div className="notice ok" style={{ marginTop: 14 }}>Commercial-capacity check passed: quantities look like personal use.</div>
            )}
            <p className="muted small" style={{ marginTop: 12 }}>Rates and allowances are illustrative for this POC.</p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => setStep(1)}>← Edit items</button>
            <button className="btn gold lg" onClick={() => { update({ flow: "scanner" }); router.push("/checkout"); }}>Proceed to payment →</button>
          </div>
        </div>
      )}
    </div>
  );
}
