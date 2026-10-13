import crypto from "node:crypto";
import { db, getOrder, saveOrder, type Order } from "./store";

interface PaymentEntity {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  error_description?: string;
}

interface WebhookEvent {
  event: string;
  payload?: {
    payment?: { entity: PaymentEntity };
    order?: { entity: { id: string; amount?: number; status?: string } };
  };
}

export type WebhookOutcome =
  | { ok: true; result: "paid" | "failed" | "duplicate" | "ignored" | "unknown_order" | "amount_mismatch" }
  | { ok: false; error: string };

function markPaid(order: Order, payment?: PaymentEntity) {
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  order.paymentId = payment?.id ?? order.paymentId;
  order.method = payment?.method ?? order.method;
  order.failureReason = undefined;
  const duty = order.lines.find((l) => l.kind === "duty");
  if (duty && !order.icegate) {
    // Simulated hand-off. A real integration must remit via an ICEGATE-authorised payment channel.
    order.icegate = {
      reference: `ICG-SIM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      status: "SIMULATED",
      amountPaise: duty.amount,
    };
  }
}

/**
 * Applies a verified Razorpay webhook event. The webhook is the source of truth for payment
 * state; the browser-side checkout callback is never trusted to mark an order as paid.
 */
export function applyWebhookEvent(rawBody: string, eventId: string | null): WebhookOutcome {
  let evt: WebhookEvent;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Malformed JSON" };
  }

  // Razorpay retries on non-2xx and may deliver the same event more than once.
  if (eventId) {
    if (db.events.has(eventId)) return { ok: true, result: "duplicate" };
    db.events.add(eventId);
    if (db.events.size > 5000) db.events.delete(db.events.values().next().value as string);
  }

  const payment = evt.payload?.payment?.entity;
  const orderId = payment?.order_id ?? evt.payload?.order?.entity.id;
  if (!orderId) return { ok: true, result: "ignored" };

  const order = getOrder(orderId);
  if (!order) return { ok: true, result: "unknown_order" };

  const reportedAmount = payment?.amount ?? evt.payload?.order?.entity.amount;
  if (reportedAmount !== undefined && reportedAmount !== order.amount) {
    console.warn(`[webhook] amount mismatch for ${order.id}: expected ${order.amount}, got ${reportedAmount}`);
    return { ok: true, result: "amount_mismatch" };
  }

  switch (evt.event) {
    case "payment.captured":
    case "order.paid":
      if (order.status !== "paid") markPaid(order, payment);
      saveOrder(order);
      return { ok: true, result: "paid" };
    case "payment.failed":
      // A paid order is terminal: a later failed retry must not downgrade it.
      if (order.status !== "paid") {
        order.status = "failed";
        order.failureReason = payment?.error_description ?? "Payment failed";
        order.paymentId = payment?.id ?? order.paymentId;
        saveOrder(order);
      }
      return { ok: true, result: "failed" };
    default:
      return { ok: true, result: "ignored" };
  }
}
