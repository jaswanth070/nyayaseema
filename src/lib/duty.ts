import type { Declaration, Gender, LineItem, StayBand } from "./catalog";

// Illustrative rates for the POC. The deck's engine (Baggage Rules mapping) will replace this.
export const FX_TO_INR: Record<string, number> = {
  INR: 1,
  AED: 22.7,
  USD: 83.4,
  EUR: 90.2,
  GBP: 106.1,
  SGD: 62.0,
  THB: 2.3,
  SAR: 22.2,
  QAR: 22.9,
  MYR: 17.7,
};

export const CURRENCIES = Object.keys(FX_TO_INR);
/** Flat rate applied beyond the free allowance (per the deck: "flat 38.5% duty"). */
export const FLAT_DUTY_RATE = 0.385;

const GENERAL_ALLOWANCE: Record<StayBand, number> = {
  lt3d: 15000,
  "3d-6m": 50000,
  "6m-1y": 50000,
  gt1y: 50000,
};

const GOLD_LIMIT: Record<Gender, { grams: number; value: number }> = {
  male: { grams: 20, value: 50000 },
  female: { grams: 40, value: 100000 },
  other: { grams: 20, value: 50000 },
};

export interface PricedItem extends LineItem {
  inr: number;
}

export interface DutyResult {
  pricedItems: PricedItem[];
  totalValue: number;
  generalValue: number;
  goldValue: number;
  generalAllowance: number;
  generalDutiable: number;
  goldFree: number;
  goldDutiable: number;
  goldEligible: boolean;
  goldGramsOver: number;
  totalDutiable: number;
  duty: number; // INR
  /** Heuristic non-commercial capacity audit */
  commercialFlags: string[];
}

const toInr = (i: LineItem) => Math.round(i.amount * i.quantity * (FX_TO_INR[i.currency] ?? 1));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateDuty(d: Pick<Declaration, "items" | "gender" | "stay">): DutyResult {
  const pricedItems: PricedItem[] = d.items.map((i) => ({ ...i, inr: toInr(i) }));
  const gold = pricedItems.filter((i) => i.category === "gold");
  const general = pricedItems.filter((i) => i.category !== "gold");

  const goldValue = gold.reduce((s, i) => s + i.inr, 0);
  const goldGrams = gold.reduce((s, i) => s + (i.grams ?? 0) * i.quantity, 0);
  const generalValue = general.reduce((s, i) => s + i.inr, 0);

  // Gold concession only for stays abroad of more than one year.
  const goldEligible = d.stay === "gt1y";
  const lim = GOLD_LIMIT[d.gender];
  const goldFree = goldEligible ? Math.min(goldValue, goldGrams <= lim.grams ? lim.value : 0) : 0;
  const goldGramsOver = goldEligible ? Math.max(0, goldGrams - lim.grams) : goldGrams;
  const goldDutiable = goldValue - goldFree;

  const generalAllowance = GENERAL_ALLOWANCE[d.stay];
  const generalDutiable = Math.max(0, generalValue - generalAllowance);

  const totalDutiable = generalDutiable + goldDutiable;
  const duty = round2(totalDutiable * FLAT_DUTY_RATE);

  const commercialFlags: string[] = [];
  for (const i of pricedItems) {
    if (i.category === "electronics" && i.quantity > 2)
      commercialFlags.push(`${i.description}: ${i.quantity} units may exceed personal-use quantity`);
    if (i.category === "alcohol-tobacco" && i.quantity > 2)
      commercialFlags.push(`${i.description}: exceeds the 2-litre / 100-stick personal allowance`);
  }
  if (goldValue > 500000) commercialFlags.push("Gold value above ₹5,00,000 may be treated as commercial import");

  return {
    pricedItems,
    totalValue: generalValue + goldValue,
    generalValue,
    goldValue,
    generalAllowance,
    generalDutiable,
    goldFree,
    goldDutiable,
    goldEligible,
    goldGramsOver,
    totalDutiable,
    duty,
    commercialFlags,
  };
}
