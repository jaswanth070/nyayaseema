import type { FlowId } from "./catalog";
import type { OrderLine } from "./pricing";

// In-memory order store. POC only: state is lost on restart and is not shared across instances.
// Replace with a database (orders table + processed_webhook_events table) for production.

export type OrderStatus = "created" | "paid" | "failed";

export interface Order {
  id: string; // Razorpay order id (or order_mock_*)
  receipt: string;
  mode: "live" | "mock";
  flow: FlowId;
  amount: number; // paise
  currency: "INR";
  lines: OrderLine[];
  status: OrderStatus;
  paymentId?: string;
  method?: string;
  failureReason?: string;
  customer: { name: string; email: string; phone: string };
  lawyerId?: string;
  jurisdictionId?: string;
  createdAt: string;
  paidAt?: string;
  icegate?: { reference: string; status: "SIMULATED"; amountPaise: number };
}

interface Db {
  orders: Map<string, Order>;
  events: Set<string>;
}

const g = globalThis as unknown as { __nyayaseema?: Db };
export const db: Db = (g.__nyayaseema ??= { orders: new Map(), events: new Set() });

export const getOrder = (id: string) => db.orders.get(id);
export const saveOrder = (o: Order) => void db.orders.set(o.id, o);

/** Public projection of an order. */
export function publicOrder(o: Order) {
  return { ...o };
}
