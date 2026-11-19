// Stub services and clients that the agent snippets call.
import * as restate from "@restatedev/restate-sdk-gen";
import type {ApprovalRequest, JsonValue} from "@restatedev/agentlib";

// <start_notify_reviewer>
export async function notifyReviewer(request: ApprovalRequest) {
  // Replace this mock with your review system's notification API.
  console.log("Review requested:", request);
}
// <end_notify_reviewer>

export const inventory = restate.object({
  name: "Inventory",
  handlers: {
    *reserve(quantity: number) {
      const stock = (yield* restate.state().get<number>("stock")) ?? 100;
      if (stock < quantity) return false;
      restate.state().set("stock", stock - quantity);
      return true;
    },
  },
});

export const emails = restate.service({
  name: "Emails",
  handlers: {
    *send(input: {to: string; body: string}) {
      return {sent: true, to: input.to};
    },
  },
});

export async function fetchTicket(ticketId: string, _options: {signal: AbortSignal}) {
  return ticketId === "T-404" ? undefined : {ticketId, status: "open"};
}

export const orders = {
  async get(orderId: string) {
    if (orderId === "missing") return undefined;
    return {customerId: orderId === "other" ? "c2" : "c1", refunded: orderId === "done"};
  },
};

export async function createRefund(orderId: string, _options: {idempotencyKey: string}) {
  return {refundId: `re_${orderId}`};
}

export async function bookRoom(hotelId: string, totalCents: number) {
  return {bookingId: `bk_${hotelId}`, totalCents};
}

export function redact(text: string) {
  return text.replace(/\b\d{12,19}\b/g, "[redacted]");
}

// Redacts every string in a JSON value.
export function redactJson(value: JsonValue): JsonValue {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactJson(item)]));
  }
  return value;
}
