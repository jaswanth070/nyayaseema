"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Declaration, DisputeDetails, FlowId, LegalDetails } from "./catalog";

export type Arrival = "indian" | "foreign";
export type Category = "tourist" | "oci";

export interface CaseState {
  arrival?: Arrival;
  category?: Category;
  flow?: FlowId;
  lawyerId?: string;
  jurisdictionId?: string;
  declaration: Declaration;
  legal: LegalDetails;
  dispute: DisputeDetails;
  offline: LegalDetails;
}

const emptyLegal = (): LegalDetails => ({
  fullName: "",
  passportNo: "",
  email: "",
  phone: "",
  flightNo: "",
  summary: "",
  documents: [],
  estimatedDuty: 0,
});

export const initialCase = (): CaseState => ({
  declaration: { gender: "male", stay: "3d-6m", items: [] },
  legal: emptyLegal(),
  offline: emptyLegal(),
  dispute: {
    fullName: "",
    passportNo: "",
    email: "",
    phone: "",
    flightNo: "",
    notice: "",
    itemsInDispute: "",
    valuationClaimed: 0,
    valuationAssessed: 0,
    bills: [],
    documents: [],
  },
});

const KEY = "nyayaseema.case.v1";

interface Ctx {
  state: CaseState;
  ready: boolean;
  update: (patch: Partial<CaseState>) => void;
  reset: () => void;
}

const CaseContext = createContext<Ctx | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>(initialCase);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState({ ...initialCase(), ...JSON.parse(raw) });
    } catch {
      /* storage unavailable: start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const update = useCallback((patch: Partial<CaseState>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(initialCase()), []);
  const value = useMemo(() => ({ state, ready, update, reset }), [state, ready, update, reset]);
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCase() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCase must be used inside CaseProvider");
  return ctx;
}
