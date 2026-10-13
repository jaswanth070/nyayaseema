"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCase, type CaseState } from "@/lib/case";

export function PageHead({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <>
      <div className="eyebrow">{eyebrow ?? "NyayaSeema — Customs Shield Pass"}</div>
      <h1 className="page-title">{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
      <hr className="rule" />
    </>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? "done" : i === current ? "active" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="n">{i < current ? "✓" : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** Redirects to /arrival when a flow is opened without the earlier selections. */
export function useGuard(need: Array<keyof CaseState>) {
  const { state, ready } = useCase();
  const router = useRouter();
  const missing = ready && need.some((k) => !state[k]);
  useEffect(() => {
    if (missing) router.replace("/arrival");
  }, [missing, router]);
  return ready && !missing;
}

export function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>
        {label}
        <div style={{ marginTop: 6, fontWeight: 400 }}>{children}</div>
      </label>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function FileDrop({
  label,
  files,
  onChange,
  accept = "image/*,application/pdf",
  capture,
}: {
  label: string;
  files: string[];
  onChange: (names: string[]) => void;
  accept?: string;
  capture?: "environment";
}) {
  return (
    <div>
      <label className="drop">
        <input
          type="file"
          multiple
          accept={accept}
          capture={capture}
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            if (names.length) onChange([...files, ...names]);
            e.target.value = "";
          }}
        />
        <strong>{label}</strong>
        <div className="muted small">PDF or image · POC stores file names only</div>
      </label>
      {files.length > 0 && (
        <ul className="filelist">
          {files.map((f, i) => (
            <li key={`${f}-${i}`}>
              <span>{f}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
