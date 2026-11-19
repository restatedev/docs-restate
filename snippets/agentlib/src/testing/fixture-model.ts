// <start_fixture>
import {journaledModel, type ModelResponse} from "@restatedev/agentlib";

export const fixtureModel = journaledModel(async (request): Promise<ModelResponse> => {
  const hasLookup = request.tools.some((tool) => tool.name === "lookupTicket");
  if (hasLookup && request.step === 1) {
    return {type: "tool_calls", calls: [{id: "t1", name: "lookupTicket", input: {ticketId: "T-42"}}]};
  }
  return {type: "final", text: "Ticket T-42 is open."};
});
// <end_fixture>
