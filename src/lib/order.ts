import type { FlowId } from "./catalog";
import type { OrderLine } from "./pricing";

/** Everything the server needs to remember about an order. It travels inside a signed token. */
export interface Order {
  id: string; // Razorpay order id (or order_mock_*)
  receipt: string;
  mode: "live" | "mock";
  flow: FlowId;
  amount: number; // paise
  currency: "INR";
  lines: OrderLine[];
  customer: { name: string };
  lawyerId?: string;
  jurisdictionId?: string;
  createdAt: string;
}

export interface Receipt {
  order: Order;
  paymentId: string;
  paidAt: string;
  icegate?: { reference: string; status: "SIMULATED"; amountPaise: number };
}
