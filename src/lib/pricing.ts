import { FLOWS, JURISDICTIONS, lawyerById, type PaidFlowId } from "./catalog";

export interface OrderLine {
  label: string;
  amount: number; // paise
  kind: "fee" | "lawyer" | "duty";
}

export interface QuoteInput {
  flow: PaidFlowId;
  lawyerId?: string;
  jurisdictionId?: string;
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
  if (!lawyer) return { error: "Please choose a lawyer" };

  if (input.flow === "offline") {
    const j = JURISDICTIONS.find((x) => x.id === input.jurisdictionId);
    if (!j) return { error: "Please choose a jurisdiction" };
    if (!lawyer.jurisdictions.includes(j.id)) return { error: "Lawyer does not appear in this jurisdiction" };
  }

  if (info.platformFee > 0) {
    lines.push({ label: "NyayaSeema Platform Fee", amount: info.platformFee, kind: "fee" });
  }

  const role = input.flow === "legal" ? "Declaration Assistance" : input.flow === "odr" ? "ODR Representation" : "Offline Representation";
  lines.push({ label: `${lawyer.name} – ${role} (Lawyer's Fee)`, amount: lawyer.fees[input.flow], kind: "lawyer" });

  if (input.flow === "legal") {
    const e = Number(input.estimatedDuty ?? 0);
    if (!Number.isFinite(e) || e < 0 || e > MAX_DUTY_INR) return { error: "Invalid duty amount" };
    dutyPaise = Math.round(e * 100);
  }

  if (dutyPaise > 0) lines.push({ label: "Customs Duty (Remitted to ICEGATE)", amount: dutyPaise, kind: "duty" });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  if (total < 100) return { error: "Order total is below the minimum of ₹1" };
  return { lines, total, dutyPaise };
}
