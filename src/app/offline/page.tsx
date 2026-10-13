"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLOWS, JURISDICTIONS } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { ContactFields, contactError } from "@/components/Contact";
import { Field, FileDrop, PageHead, Stepper, useGuard } from "@/components/Ui";
import { LawyerPicker } from "@/components/LawyerPicker";

export default function OfflineFlow() {
  const router = useRouter();
  const ok = useGuard(["arrival", "category"]);
  const { state, update } = useCase();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const o = state.offline;
  if (!ok) return null;

  return (
    <div className="wrap page">
      <PageHead title={FLOWS.offline.title} lead={FLOWS.offline.tagline} />
      <Stepper steps={FLOWS.offline.steps} current={step} />

      {step === 0 && (
        <div className="card blue">
          <h2>Case document</h2>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <ContactFields value={o} onChange={(v) => update({ offline: v })} />
            <Field label="Case summary" full>
              <textarea className="input" value={o.summary} placeholder="What happened at the airport and what representation do you need?" onChange={(e) => update({ offline: { ...o, summary: e.target.value } })} />
            </Field>
            <div className="full"><FileDrop label="Upload customs notice, bills and passport" files={o.documents} onChange={(documents) => update({ offline: { ...o, documents } })} /></div>
          </div>
          {error && <p className="error-text" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          <div className="actions">
            <Link href="/services" className="btn ghost">← Back</Link>
            <button className="btn gold" onClick={() => {
              const e = contactError(o) || (!o.summary.trim() ? "Please summarise your case." : "") || (o.documents.length === 0 ? "Upload at least one document." : "");
              if (e) return setError(e);
              setError(""); setStep(1);
            }}>Choose jurisdiction →</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <div className="grid two" role="radiogroup" aria-label="Jurisdiction">
            {JURISDICTIONS.map((j) => (
              <button key={j.id} role="radio" aria-checked={state.jurisdictionId === j.id}
                className={`choice${state.jurisdictionId === j.id ? " selected" : ""}`}
                onClick={() => update({ jurisdictionId: j.id, lawyerId: undefined })}>
                <h3>{j.airport} <span className="pill">{j.code}</span></h3>
                <p>{j.authority}</p>
              </button>
            ))}
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => { setError(""); setStep(0); }}>← Back</button>
            <button className="btn gold" onClick={() => (state.jurisdictionId ? (setError(""), setStep(2)) : setError("Please choose a jurisdiction."))}>Choose a lawyer →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <LawyerPicker flow="offline" jurisdictionId={state.jurisdictionId} value={state.lawyerId} onChange={(id) => update({ lawyerId: id })} />
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn ghost" onClick={() => { setError(""); setStep(1); }}>← Back</button>
            <button className="btn gold" onClick={() => {
              if (!state.lawyerId) return setError("Please choose a lawyer.");
              update({ flow: "offline" });
              router.push("/checkout");
            }}>Proceed to payment →</button>
          </div>
        </div>
      )}
    </div>
  );
}
