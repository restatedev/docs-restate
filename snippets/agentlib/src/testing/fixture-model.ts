// <start_fixture>
import {journaledModel, type ModelResponse} from "@restatedev/agentlib";
import {TerminalError} from "@restatedev/restate-sdk";
import {z} from "zod";

export const fixtureModel = journaledModel(async (request): Promise<ModelResponse> => {
  if (request.step === 1) {
    return {type: "tool_calls", calls: [{id: "t1", name: "lookupTicket", input: {ticketId: "T-42"}}]};
  }
  const lookup = request.messages.findLast(
    (message) => message.role === "tool" && message.name === "lookupTicket" && message.callId === "t1",
  );
  if (lookup?.role !== "tool" || lookup.result.status !== "success") {
    throw new TerminalError("Fixture expected a successful lookupTicket result");
  }
  const ticket = z.object({ticketId: z.literal("T-42"), status: z.string()}).safeParse(lookup.result.output);
  if (!ticket.success) throw new TerminalError("Fixture received invalid ticket data");
  return {type: "final", text: `Ticket ${ticket.data.ticketId} is ${ticket.data.status}.`};
});
// <end_fixture>
