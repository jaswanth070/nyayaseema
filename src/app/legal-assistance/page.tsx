"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLOWS } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { ContactFields, contactError } from "@/components/Contact";
import { Field, FileDrop, PageHead, Stepper, useGuard } from "@/components/Ui";
import { LawyerPicker } from "@/components/LawyerPicker";

export default function LegalAssistance() {
  const router = useRouter();
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const l = state.legal;
  if (!ok) return null;

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.legal.title} lead={FLOWS.legal.tagline} />
      <Stepper steps={FLOWS.legal.steps} current={step} />

      {step === 0 && (
        <div className="stack">
          <LawyerPicker flow="legal" value={state.lawyerId} onChange={(id) => update({ lawyerId: id })} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="actions" style={{ marginTop: 0 }}>
            <Link href="/services" className="btn ghost">← Back</Link>
            <button className="btn gold" onClick={() => (state.lawyerId ? (setError(""), setStep(1)) : setError("Please choose a lawyer to connect with."))}>
              Connect &amp; fill documents →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card blue">
          <h2>Declaration documents</h2>
          <p className="muted small" style={{ margin: "6px 0 18px" }}>
            Your lawyer uses these to prepare the declaration. Duty is paid together with the fee and remitted to ICEGATE.
          </p>
          <div className="form-grid">
            <ContactFields value={l} onChange={(v) => update({ legal: v })} />
            <Field label="Customs duty payable (₹)" hint="From your declaration / the duty summary your lawyer prepared. Enter 0 if none.">
              <input className="input" type="number" min={0} value={l.estimatedDuty || ""} onChange={(e) => update({ legal: { ...l, estimatedDuty: Number(e.target.value) } })} />
            </Field>
            <Field label="Goods carried and context" full>
              <textarea className="input" value={l.summary} placeholder="e.g. 1 laptop, 2 smartphones and 20 g gold jewellery purchased in Dubai; stayed abroad 8 months." onChange={(e) => update({ legal: { ...l, summary: e.target.value } })} />
            </Field>
            <div className="full">
              <FileDrop label="Upload passport, invoices and receipts" files={l.documents} onChange={(documents) => update({ legal: { ...l, documents } })} />
            </div>
          </div>
          {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          <div className="actions">
            <button className="btn ghost" onClick={() => { setError(""); setStep(0); }}>← Back</button>
            <button className="btn gold" onClick={() => {
              const e = contactError(l) || (!l.summary.trim() ? "Please describe the goods you are declaring." : "") || (!(l.estimatedDuty >= 0) ? "Duty amount is invalid." : "");
              if (e) return setError(e);
              update({ flow: "legal" });
              router.push("/checkout");
            }}>Proceed to payment →</button>
          </div>
        </div>
      )}
    </div>
  );
}
