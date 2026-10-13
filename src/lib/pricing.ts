import { FLOWS, JURISDICTIONS, lawyerById, type Declaration, type FlowId } from "./catalog";
import { calculateDuty } from "./duty";

export interface OrderLine {
  label: string;
  amount: number; // paise
  kind: "fee" | "lawyer" | "duty";
}

export interface QuoteInput {
  flow: FlowId;
  lawyerId?: string;
  jurisdictionId?: string;
  declaration?: Pick<Declaration, "items" | "gender" | "stay">;
  /** INR, legal-assistance flow only */
  estimatedDuty?: number;
}

export interface Quote {
  lines: OrderLine[];
  total: number; // paise
  dutyPaise: number;
}

const MAX_DUTY_INR = 1_000_000;

/** Server-authoritative pricing. The client never sends an amount. */
export function quote(input: QuoteInput): Quote | { error: string } {
  const info = FLOWS[input.flow];
  if (!info) return { error: "Unknown service" };
  const lines: OrderLine[] = [];
  let dutyPaise = 0;

  const lawyer = lawyerById(input.lawyerId);
  if (input.flow !== "scanner" && !lawyer) return { error: "Please choose a lawyer" };

  if (input.flow === "offline") {
    const j = JURISDICTIONS.find((x) => x.id === input.jurisdictionId);
    if (!j) return { error: "Please choose a jurisdiction" };
    if (!lawyer!.jurisdictions.includes(j.id)) return { error: "Lawyer does not appear in this jurisdiction" };
  }

  if (info.platformFee > 0) {
    const label =
      input.flow === "scanner"
        ? "CustomsQR declaration certificate"
        : input.flow === "odr"
          ? "ODR session fee"
          : "Platform convenience fee";
    lines.push({ label, amount: info.platformFee, kind: "fee" });
  }

  if (lawyer && input.flow !== "scanner") {
    const label =
      input.flow === "legal"
        ? `${lawyer.name} – declaration assistance`
        : input.flow === "odr"
          ? `${lawyer.name} – ODR representation`
          : `${lawyer.name} – offline representation`;
    lines.push({ label, amount: lawyer.fees[input.flow], kind: "lawyer" });
  }

  if (input.flow === "scanner") {
    const d = input.declaration;
    if (!d || !Array.isArray(d.items) || d.items.length === 0) return { error: "Add at least one receipt item" };
    if (d.items.length > 50) return { error: "Too many items" };
    for (const i of d.items) {
      if (!(i.amount >= 0) || !(i.quantity >= 1) || !Number.isFinite(i.amount * i.quantity))
        return { error: "Invalid item amount or quantity" };
    }
    dutyPaise = Math.round(calculateDuty(d).duty * 100);
  } else if (input.flow === "legal") {
    const e = Number(input.estimatedDuty ?? 0);
    if (!Number.isFinite(e) || e < 0 || e > MAX_DUTY_INR) return { error: "Invalid duty amount" };
    dutyPaise = Math.round(e * 100);
  }

  if (dutyPaise > 0) lines.push({ label: "Customs duty (remitted to ICEGATE)", amount: dutyPaise, kind: "duty" });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  if (total < 100) return { error: "Order total is below the minimum of ₹1" };
  return { lines, total, dutyPaise };
}
