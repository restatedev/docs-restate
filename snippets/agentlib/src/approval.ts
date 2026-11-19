import * as restate from "@restatedev/restate-sdk-gen";
import {agent, asyncTool, humanApprovalTool, type ApprovalRequest} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";

// <start_needs_approval>
const support = agent({
  model,
  instructions: "Close tickets when the user asks. Closing needs human approval.",
  tools: {
    closeTicket: asyncTool({
      description: "Close a ticket.",
      input: z.object({ticketId: z.string()}),
      needsApproval: true,
      async execute({ticketId}) {
        return {ticketId, status: "closed"};
      },
    }),
  },
});
// <end_needs_approval>

// <start_approval_object>
export const ticketApproval = restate.object({
  name: "TicketApproval",
  handlers: {
    *ask(message: string) {
      try {
        const result = yield* support.run(message, {
          *onApproval(request) {
            // Publish the request: store it, or notify a person through restate.run.
            restate.state().set("approval", request);
          },
        });
        if (result.status !== "completed") return result.output ?? result.reason;
        return result.output;
      } finally {
        restate.state().clear("approval");
      }
    },
    *status() {
      return yield* restate.sharedState().get<ApprovalRequest>("approval");
    },
    *approve({invocationId, signalName, approved}: {invocationId: string; signalName: string; approved: boolean}) {
      restate.invocation(invocationId).signal(signalName).resolve(approved);
      return true;
    },
  },
  options: {handlers: {status: {shared: true}, approve: {shared: true}}},
});
// <end_approval_object>

// <start_conditional>
const refunds = asyncTool({
  description: "Refund an order.",
  input: z.object({orderId: z.string(), amountCents: z.number().int().positive()}),
  *needsApproval({amountCents}) {
    return amountCents > 10_000; // refunds above 100 USD need a person
  },
  async execute({orderId, amountCents}) {
    return {orderId, amountCents, status: "refunded"};
  },
});
// <end_conditional>

// <start_timeout>
const timedSupport = agent({
  model,
  tools: {refunds},
  *onHumanApproval(request) {
    restate.state().set("approval", request);
    const {tag, future} = yield* restate.select({
      decision: restate.signal<boolean>(request.signalName),
      timeout: restate.sleep({hours: 24}),
    });
    if (tag === "timeout") return false; // deny when nobody answers within a day
    return (yield* future) as boolean;
  },
});
// <end_timeout>

// <start_approval_tool>
const planner = agent({
  model,
  instructions: "Ask the user for confirmation with askUser before you make irreversible changes.",
  tools: {askUser: humanApprovalTool()},
});
// <end_approval_tool>

export const agents = {timedSupport, planner};
