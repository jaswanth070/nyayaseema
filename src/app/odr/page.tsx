"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLOWS } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { ContactFields, contactError } from "@/components/Contact";
import { Field, FileDrop, PageHead, Stepper, useGuard } from "@/components/Ui";
import { LawyerPicker } from "@/components/LawyerPicker";

export default function OdrFlow() {
  const router = useRouter();
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const d = state.dispute;
  if (!ok) return null;

  const num = (k: "valuationClaimed" | "valuationAssessed") => (
    <input className="input" type="number" min={0} value={d[k] || ""} onChange={(e) => update({ dispute: { ...d, [k]: Number(e.target.value) } })} />
  );

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.odr.title} lead={FLOWS.odr.tagline} />
      <Stepper steps={FLOWS.odr.steps} current={step} />

      {step === 0 && (
        <div className="card blue">
          <h2>Dispute details &amp; evidence</h2>
          <p className="muted small" style={{ margin: "6px 0 18px" }}>
            Provide what customs flagged and upload original bills so your lawyer can negotiate a settlement online.
          </p>
          <div className="form-grid">
            <ContactFields value={d} onChange={(v) => update({ dispute: v })} />
            <Field label="Items in dispute" full>
              <input className="input" value={d.itemsInDispute} placeholder="e.g. Gold chain 22K (18 g), smartphone" onChange={(e) => update({ dispute: { ...d, itemsInDispute: e.target.value } })} />
            </Field>
            <Field label="Value you declared (₹)">{num("valuationClaimed")}</Field>
            <Field label="Value assessed by customs (₹)">{num("valuationAssessed")}</Field>
            <Field label="What did customs say? (notice / reason)" full>
              <textarea className="input" value={d.notice} placeholder="Higher valuation, reclassification as commercial, quantity dispute…" onChange={(e) => update({ dispute: { ...d, notice: e.target.value } })} />
            </Field>
            <div className="full"><FileDrop label="Upload bills / invoices" files={d.bills} onChange={(bills) => update({ dispute: { ...d, bills } })} /></div>
            <div className="full"><FileDrop label="Upload other documents (customs notice, passport, ticket)" files={d.documents} onChange={(documents) => update({ dispute: { ...d, documents } })} /></div>
          </div>
          {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          <div className="actions">
            <Link href="/services" className="btn ghost">← Back</Link>
            <button className="btn gold" onClick={() => {
              const e = contactError(d) || (!d.itemsInDispute.trim() || !d.notice.trim() ? "Describe the items in dispute and what customs said." : "") || (d.bills.length === 0 ? "Upload at least one bill or invoice." : "");
              if (e) return setError(e);
              setError(""); setStep(1);
            }}>Choose a lawyer →</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <LawyerPicker flow="odr" value={state.lawyerId} onChange={(id) => update({ lawyerId: id })} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => { setError(""); setStep(0); }}>← Back</button>
            <button className="btn gold" onClick={() => {
              if (!state.lawyerId) return setError("Please choose a lawyer.");
              update({ flow: "odr" });
              router.push("/checkout");
            }}>Proceed to payment →</button>
          </div>
        </div>
      )}
    </div>
  );
}
