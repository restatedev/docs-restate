// A fixture model for snippets.test.ts. It picks a response from the tools and instructions in the request.
import {TerminalError} from "@restatedev/restate-sdk";
import {journaledModel, type ModelResponse} from "@restatedev/agentlib";

export const verifyModel = journaledModel(async (request): Promise<ModelResponse> => {
  const names = request.tools.map((tool) => tool.name);
  const toolMessages = request.messages.filter((message) => message.role === "tool");
  const users = request.messages.filter((message) => message.role === "user");
  const input = users.at(-1)?.content ?? "";
  if (input === "unanswerable") throw new TerminalError("The model is unavailable");
  if (request.name === "Compact context") {
    // compaction.instructions replaces the default guidance in the summary request
    const custom = JSON.stringify(request).includes("promises made to the customer");
    return {type: "final", text: custom ? "Open requests and order IDs" : "Earlier turns, summarized"};
  }
  if (request.outputSchema) {
    if (request.instructions?.startsWith("Choose the one specialist")) {
      return {type: "final", text: "", output: {specialist: "billing"}};
    }
    return {type: "final", text: "", output: {category: "billing", summary: input}};
  }
  if (toolMessages.length === 0) {
    if (names.includes("closeTicket")) {
      const ticketIds = input.match(/T-\d+/g) ?? ["T-42"];
      return {type: "tool_calls", calls: ticketIds.map((ticketId, i) => ({id: `c${i + 1}`, name: "closeTicket", input: {ticketId}}))};
    }
    if (names.includes("bookHotel")) {
      return {type: "tool_calls", calls: [{id: "b1", name: "bookHotel", input: {hotelId: input}}]};
    }
    if (names.includes("refund")) {
      return {type: "tool_calls", calls: [{id: "r1", name: "refund", input: {orderId: input}}]};
    }
  }
  if (toolMessages.length > 0) {
    if (names.includes("closeTicket")) {
      return {type: "final", text: JSON.stringify(toolMessages.map((message) => message.result))};
    }
    const last = toolMessages.at(-1)!;
    return {type: "final", text: last.role === "tool" ? JSON.stringify(last.result) : ""};
  }
  return {type: "final", text: `${request.instructions?.split(" ")[1] ?? ""}|users:${users.length}|${input}`};
});
