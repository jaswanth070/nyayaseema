"use client";

import { LAWYERS, formatINR, JURISDICTIONS, type PaidFlowId } from "@/lib/catalog";

export function LawyerPicker({
  flow,
  value,
  onChange,
  jurisdictionId,
}: {
  flow: PaidFlowId;
  value?: string;
  onChange: (id: string) => void;
  jurisdictionId?: string;
}) {
  const list = LAWYERS.filter((l) => (jurisdictionId ? l.jurisdictions.includes(jurisdictionId) : true));
  if (list.length === 0) return <div className="notice">No lawyers are listed for this jurisdiction yet.</div>;
  return (
    <div className="stack" role="radiogroup" aria-label="Choose a Lawyer">
      {list.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          className={`lawyer${value === l.id ? " selected" : ""}`}
          onClick={() => onChange(l.id)}
        >
          <span className="avatar" aria-hidden="true">{l.initials}</span>
          <span>
            <strong>{l.name}</strong>
            <span className="muted small" style={{ display: "block" }}>{l.headline}</span>
            <span className="small" style={{ display: "block", marginTop: 4 }}>
              ★ {l.rating.toFixed(1)} · {l.experienceYears} yrs · {l.cases} cases · {l.languages.join(", ")}
            </span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {l.jurisdictions.map((j) => (
                <span key={j} className="pill">{JURISDICTIONS.find((x) => x.id === j)?.code}</span>
              ))}
              {flow === "odr" && (
                <span className={`pill ${l.online ? "ok" : ""}`}>{l.online ? "Online Now" : "Next-Day Slot"}</span>
              )}
            </span>
          </span>
          <span className="fee">
            <strong className="num">{formatINR(l.fees[flow])}</strong>
            <span className="muted small" style={{ display: "block" }}>
              {flow === "legal" ? "Lawyer's Fee" : flow === "odr" ? "Lawyer's Fee · Per Session" : "Lawyer's Fee · Per Appearance"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
