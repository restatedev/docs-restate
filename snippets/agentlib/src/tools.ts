import * as restate from "@restatedev/restate-sdk-gen";
import {
  agent,
  asyncTool,
  awaitChild,
  cancelOperationTool,
  handlerTool,
  serviceTool,
  sleepTool,
  tool,
  ToolError,
  type Tool,
} from "@restatedev/agentlib";
import {mcpTools} from "@restatedev/agentlib/mcp";
import {programTool} from "@restatedev/agentlib/program";
import {z} from "zod";
import {model} from "./model.js";
import {emails, fetchTicket, inventory} from "./services.js";

// <start_async_tool>
const lookupTicket = asyncTool({
  description: "Look up a ticket's status.",
  input: z.object({ticketId: z.string()}),
  retry: {maxAttempts: 5, initialInterval: {milliseconds: 250}, exponentiationFactor: 2},
  async execute({ticketId}, {signal}) {
    const ticket = await fetchTicket(ticketId, {signal});
    if (!ticket) throw new ToolError(`No ticket ${ticketId}`, "not_found");
    return ticket;
  },
});

const support = agent({
  model,
  instructions: "Use lookupTicket to answer questions about tickets.",
  tools: {lookupTicket},
});
// <end_async_tool>

type Order = {orderId: string};

// <start_tool>
const reserve: Tool<Order> = tool({
  description: "Reserve stock for the current order.",
  input: z.object({sku: z.string(), quantity: z.number().int().positive()}),
  *execute({sku, quantity}, {context}) {
    // awaitChild cancels the call if the run is interrupted
    const reserved = yield* awaitChild(restate.client(inventory, sku).reserve(quantity));
    if (!reserved) throw new ToolError(`Not enough stock for ${sku}`, "out_of_stock");
    return {sku, quantity, orderId: context.orderId};
  },
});
// <end_tool>

// <start_iface>
// The interface declares the handlers with their schemas and descriptions.
export const refundIface = restate.iface.service("RefundService", {
  getPolicy: restate.iface.schemas({
    input: z.object({}),
    output: z.object({refundWindowDays: z.number()}),
    description: "Read the refund policy.",
  }),
  issueRefund: restate.iface.schemas({
    input: z.object({orderId: z.string(), amountCents: z.number().int().positive()}),
    output: z.object({refundId: z.string()}),
    description: "Issue a refund for an order. The amount is in cents.",
  }),
});

// The refund service implements the interface.
export const refundService = restate.implement(refundIface, {
  handlers: {
    *getPolicy() {
      return {refundWindowDays: 30};
    },
    *issueRefund({orderId}) {
      return {refundId: `re_${orderId}`};
    },
  },
});

// A tool for the issueRefund handler only
const issueRefund = serviceTool({iface: refundIface, handler: "issueRefund"});
// <end_iface>

// <start_handler_tools>
const orderAgent = agent<Order>({
  model,
  tools: {
    // One handler, with the arguments you choose.
    sendEmail: handlerTool({
      description: "Send an email to the customer.",
      input: z.object({to: z.string(), body: z.string()}),
      call: (input) => restate.client(emails).send(input),
    }),
    // Every handler of a service, from its interface.
    refunds: serviceTool(refundIface),
    reserve,
  },
});
// <end_handler_tools>

// <start_context>
type Ctx = {customerId: string};

const listOrders: Tool<Ctx> = asyncTool({
  description: "List the current customer's orders.",
  input: z.object({}),
  async execute(_input, {context}) {
    // The customer ID comes from the application, not from the model.
    return {customerId: context.customerId, orders: ["O-1", "O-2"]};
  },
});

const accountAgent = agent<Ctx>({model, tools: {listOrders}});
// in a handler: yield* accountAgent.run(question, {context: {customerId}});
// <end_context>

// <start_mcp>
export const docsGuide = restate.service({
  name: "DocsGuide",
  handlers: {
    *ask(question: string) {
      // The tool catalog is fetched once and journaled.
      const docs = yield* mcpTools({
        url: "https://docs.restate.dev/mcp",
        namespace: "docs",
        protocol: "stateless",
        allow: (name) => name !== "submit_feedback",
      });
      const result = yield* guide.run(question, {tools: docs.tools});
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});
// <end_mcp>

const guide = agent({model, instructions: "Answer questions about Restate from its documentation."});

// <start_tool_search>
const catalogAgent = agent({
  model,
  tools: {lookupTicket, refunds: serviceTool({iface: refundIface, deferred: true})},
  toolSearch: false, // list the deferred refunds tool from the start
});
// <end_tool_search>

// <start_code_mode>
const ticketAgent = agent({
  model,
  tools: {
    lookupTicket,
    issueRefund,
    // Programs can call only lookupTicket, at most 20 times per program
    program: programTool({tools: ["lookupTicket"], limits: {maxToolCalls: 20}}),
  },
});

const directAgent = agent({model, tools: {lookupTicket}, codeMode: false}); // no run_program
// <end_code_mode>

// <start_background>
const researcher = agent({
  model,
  tools: {
    crawlSite: asyncTool({
      description: "Crawl a website and return its pages. Takes several minutes.",
      input: z.object({url: z.string()}),
      background: true,
      async execute({url}) {
        return {url, pages: 42};
      },
    }),
    sleep: sleepTool(),
    cancel: cancelOperationTool(),
  },
});
// <end_background>

export const ticketDesk = restate.service({
  name: "TicketDesk",
  handlers: {
    *ask(question: string) {
      const result = yield* support.run(question);
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
    *order(input: {orderId: string; message: string}) {
      const result = yield* orderAgent.run(input.message, {context: {orderId: input.orderId}});
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});

export const agents = {accountAgent, catalogAgent, directAgent, researcher, ticketAgent};
