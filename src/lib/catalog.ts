// Shared (client + server) catalogue: flows, fee schedule, jurisdictions and sample lawyers.
// All lawyer records are fictitious sample data for the POC.

export type FlowId = "scanner" | "legal" | "odr" | "offline";
/** Flows that go through Razorpay. The item scanner is free. */
export type PaidFlowId = Exclude<FlowId, "scanner">;

/** Flat ₹999 platform fee for every lawyer service. The lawyer's own fee is added on top. */
export const PLATFORM_FEE = 99900;

export interface FlowInfo {
  id: FlowId;
  title: string;
  tagline: string;
  href: string;
  /** NyayaSeema platform fee in paise (₹ x 100), charged on top of the lawyer's fee. */
  platformFee: number;
  steps: string[];
}

export const FLOWS: Record<FlowId, FlowInfo> = {
  scanner: {
    id: "scanner",
    title: "Item Scanner",
    tagline:
      "Bringing products from abroad to India? Scan your item before you buy to review relevant customs information and estimated duty.",
    href: "/scanner",
    platformFee: 0,
    steps: ["Scan Item", "Duty Summary"],
  },
  legal: {
    id: "legal",
    title: "Legal Assistance for Declaration",
    tagline:
      "Connect with legal assistance, understand the applicable requirements, and prepare your documents with greater confidence.",
    href: "/legal-assistance",
    platformFee: PLATFORM_FEE,
    steps: ["Connect to Lawyer", "Fill Documents", "Payment", "ICEGATE Remittance"],
  },
  odr: {
    id: "odr",
    title: "Lawyer for Virtual Assistance",
    tagline:
      "Stopped at customs? Submit your dispute details and request virtual legal assistance, where available.",
    href: "/virtual-assistance",
    platformFee: PLATFORM_FEE,
    steps: ["Case Details & Bills", "Choose Lawyer", "Payment to Lawyer", "Lawyer Ready"],
  },
  offline: {
    id: "offline",
    title: "Lawyer for Offline Representation",
    tagline:
      "Need further action? Find a suitable lawyer near the relevant court or tribunal for the next stage of your case.",
    href: "/offline",
    platformFee: PLATFORM_FEE,
    steps: ["Fill Document", "Choose Jurisdiction", "Choose Lawyer", "Payment", "Lawyer Assigned"],
  },
};

export interface Jurisdiction {
  id: string;
  airport: string;
  code: string;
  authority: string;
}

export const JURISDICTIONS: Jurisdiction[] = [
  { id: "del", airport: "Delhi", code: "DEL", authority: "Commissionerate of Customs (Airport & General), IGI Airport" },
  { id: "bom", airport: "Mumbai", code: "BOM", authority: "Commissionerate of Customs (Airport), CSMI Airport" },
  { id: "maa", airport: "Chennai", code: "MAA", authority: "Commissionerate of Customs (Airport), Anna International" },
  { id: "blr", airport: "Bengaluru", code: "BLR", authority: "Commissionerate of Customs (Airport & Air Cargo), KIA" },
  { id: "hyd", airport: "Hyderabad", code: "HYD", authority: "Commissionerate of Customs (Airport), RGI Airport" },
  { id: "ccu", airport: "Kolkata", code: "CCU", authority: "Commissionerate of Customs (Airport), NSCBI Airport" },
  { id: "cok", airport: "Kochi", code: "COK", authority: "Commissionerate of Customs (Preventive), CIAL" },
  { id: "amd", airport: "Ahmedabad", code: "AMD", authority: "Commissionerate of Customs (Airport), SVPI Airport" },
];

export interface Lawyer {
  id: string;
  name: string;
  initials: string;
  headline: string;
  experienceYears: number;
  rating: number;
  cases: number;
  languages: string[];
  /** Jurisdiction ids this advocate appears before. */
  jurisdictions: string[];
  /** Fee in paise for each engagement type. */
  fees: { legal: number; odr: number; offline: number };
  online: boolean;
}

export const LAWYERS: Lawyer[] = [
  {
    id: "lw-001",
    name: "Adv. Ananya Rao",
    initials: "AR",
    headline: "Customs Valuation & Baggage-Rule Disputes",
    experienceYears: 14,
    rating: 4.9,
    cases: 612,
    languages: ["English", "Hindi", "Telugu"],
    jurisdictions: ["hyd", "blr", "maa"],
    fees: { legal: 79900, odr: 149900, offline: 349900 },
    online: true,
  },
  {
    id: "lw-002",
    name: "Adv. Rohan Mehta",
    initials: "RM",
    headline: "Gold & Jewellery Classification, Seizure Appeals",
    experienceYears: 11,
    rating: 4.8,
    cases: 438,
    languages: ["English", "Hindi", "Gujarati"],
    jurisdictions: ["bom", "amd", "del"],
    fees: { legal: 69900, odr: 129900, offline: 299900 },
    online: true,
  },
  {
    id: "lw-003",
    name: "Adv. Kavitha Nair",
    initials: "KN",
    headline: "Electronics & Personal-Effects Reclassification",
    experienceYears: 9,
    rating: 4.7,
    cases: 301,
    languages: ["English", "Malayalam", "Tamil"],
    jurisdictions: ["cok", "maa", "blr"],
    fees: { legal: 59900, odr: 109900, offline: 249900 },
    online: true,
  },
  {
    id: "lw-004",
    name: "Adv. Imran Siddiqui",
    initials: "IS",
    headline: "Non-Commercial Quantity Audits, OCI & NRI Baggage",
    experienceYears: 17,
    rating: 4.9,
    cases: 884,
    languages: ["English", "Hindi", "Urdu"],
    jurisdictions: ["del", "bom", "ccu"],
    fees: { legal: 89900, odr: 169900, offline: 399900 },
    online: true,
  },
  {
    id: "lw-005",
    name: "Adv. Sneha Banerjee",
    initials: "SB",
    headline: "Adjudication Hearings & CESTAT Representation",
    experienceYears: 12,
    rating: 4.6,
    cases: 356,
    languages: ["English", "Bengali", "Hindi"],
    jurisdictions: ["ccu", "del"],
    fees: { legal: 64900, odr: 119900, offline: 279900 },
    online: false,
  },
  {
    id: "lw-006",
    name: "Adv. Vikram Desai",
    initials: "VD",
    headline: "Airport Customs Seizures & Provisional Release",
    experienceYears: 8,
    rating: 4.5,
    cases: 227,
    languages: ["English", "Hindi", "Marathi"],
    jurisdictions: ["bom", "amd"],
    fees: { legal: 54900, odr: 99900, offline: 229900 },
    online: true,
  },
];

export const lawyerById = (id: string | undefined) => LAWYERS.find((l) => l.id === id);
export const jurisdictionById = (id: string | undefined) => JURISDICTIONS.find((j) => j.id === id);

export type Gender = "male" | "female" | "other";
export type StayBand = "lt3d" | "3d-6m" | "6m-1y" | "gt1y";

export const STAY_LABELS: Record<StayBand, string> = {
  lt3d: "Less than 3 days",
  "3d-6m": "3 days – 6 months",
  "6m-1y": "6 months – 1 year",
  gt1y: "More than 1 year",
};

export interface LineItem {
  id: string;
  description: string;
  category: "general" | "electronics" | "gold" | "alcohol-tobacco" | "gift";
  amount: number; // foreign currency units
  currency: string; // ISO code
  quantity: number;
  /** grams, only for gold / jewellery */
  grams?: number;
}

/** Inputs to the duty calculation. The scanner assumes defaults because it collects no forms. */
export interface Declaration {
  gender: Gender;
  stay: StayBand;
  items: LineItem[];
}

export interface LegalDetails {
  fullName: string;
  passportNo: string;
  email: string;
  phone: string;
  flightNo: string;
  summary: string;
  documents: string[]; // file names only in the POC
  estimatedDuty: number; // INR, entered by passenger for the declaration assistance flow
}

export interface DisputeDetails {
  fullName: string;
  passportNo: string;
  email: string;
  phone: string;
  flightNo: string;
  notice: string; // what customs flagged
  itemsInDispute: string;
  valuationClaimed: number; // INR
  valuationAssessed: number; // INR
  bills: string[];
  documents: string[];
}

export const formatINR = (paise: number, fractionDigits = 2) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(
    paise / 100,
  );
