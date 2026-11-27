import * as restate from "@restatedev/restate-sdk-gen";
import {TerminalError} from "@restatedev/restate-sdk";
import {agent, AgentTerminalError, asyncTool, isAgentTerminal, ToolError, type Tool} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";
import {createRefund, orders} from "./services.js";

// <start_throw>
const refund: Tool<{customerId: string}> = asyncTool({
  description: "Refund an order.",
  input: z.object({orderId: z.string()}),
  async execute({orderId}, {context, invocationId, name, callId}) {
    const order = await orders.get(orderId); // a network error: retried
    if (!order) throw new ToolError(`No order ${orderId}`, "not_found"); // the model receives the code
    if (order.refunded) throw new TerminalError("The order was already refunded"); // the model decides
    if (order.customerId !== context.customerId) {
      throw new AgentTerminalError("The order belongs to another customer"); // the run fails
    }
    return await createRefund(orderId, {idempotencyKey: `${invocationId}:${name}:${callId}`});
  },
});
// <end_throw>

const support = agent<{customerId: string}>({model, tools: {refund}});

export const refunds = restate.service({
  name: "Refunds",
  handlers: {
    // <start_catch>
    *handle({customerId, message}: {customerId: string; message: string}) {
      try {
        const result = yield* support.run(message, {context: {customerId}});
        return result.status === "completed" ? result.output : (result.output ?? result.reason);
      } catch (error) {
        if (isAgentTerminal(error)) return `Request refused: ${error.message}`;
        throw error;
      }
    },
    // <end_catch>
  },
});
