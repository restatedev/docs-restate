import * as restate from "@restatedev/restate-sdk-gen";
import {connect, rpc} from "@restatedev/restate-sdk-clients";
import {agent, Conversation} from "@restatedev/agentlib";
import {model} from "./model.js";

const assistant = agent({
  model,
  instructions: "Answer the customer's questions about their orders.",
});

// <start_chat>
export const supportChat = restate.object({
  name: "SupportChat",
  handlers: {
    *ask(message: string) {
      const result = yield* assistant.run(message, {conversation: new Conversation()});
      if (result.status !== "completed") return result.output ?? result.reason;
      return result.output;
    },
    *history({from, limit}: {from?: number; limit?: number}) {
      return yield* new Conversation().page(from, limit);
    },
  },
  options: {
    state: {preload: ["conversation/meta", "conversation/summary"]},
    handlers: {history: {shared: true}},
  },
});
// <end_chat>

// <start_call>
export async function ask(restateUrl: string, chatId: string, message: string) {
  const ingress = connect({url: restateUrl}); // for example, http://localhost:8080
  return await ingress.client(supportChat, chatId).ask(message);
}
// <end_call>

// <start_send>
export async function askAndAttach(restateUrl: string, chatId: string, message: string, requestId: string) {
  const ingress = connect({url: restateUrl});
  // Returns as soon as Restate accepts the request
  const handle = await ingress
    .sendClient(supportChat, chatId)
    .ask(message, rpc.sendOpts({idempotencyKey: requestId}));
  // Later: wait for the answer
  return await ingress.result(handle);
}
// <end_send>
