import * as restate from "@restatedev/restate-sdk-gen";
import {agent, LazyStateConversation, type Message} from "@restatedev/agentlib";
import {model} from "./model.js";

const assistant = agent({
  model,
  instructions: "Use the conversation to remember what the user told you.",
});

// <start_conversation>
export const chatSession = restate.object({
  name: "ChatSession",
  handlers: {
    *ask(message: string) {
      const result = yield* assistant.run(message, {conversation: new LazyStateConversation()});
      if (result.status !== "completed") return result.output ?? result.reason;
      return result.output;
    },
    *history() {
      return yield* new LazyStateConversation().page();
    },
  },
  options: {handlers: {history: {shared: true}}},
});
// <end_conversation>

export const compactedChat = restate.object({
  name: "CompactedChat",
  handlers: {
    *ask(message: string) {
      // <start_conversation_compaction>
      const conversation = new LazyStateConversation({
        compaction: {model, policy: {maxMessages: 64, maxChars: 64000, retainMessages: 12}}, // the default policy
      });
      const result = yield* assistant.run(message, {conversation});
      // <end_conversation_compaction>
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
    *history() {
      return yield* new LazyStateConversation().page();
    },
  },
  options: {handlers: {history: {shared: true}}},
});

// <start_run_compaction>
const researcher = agent({
  model,
  maxSteps: 40,
  compaction: {maxTokens: 100000, retainTokens: 25000}, // the defaults
});
// <end_run_compaction>

// <start_tool_results>
const crawler = agent({
  model,
  toolResults: {maxTokens: 5000, previewTokens: 2500}, // the defaults; false sends results in full
});
// <end_tool_results>

// <start_messages>
export const manualChat = restate.object({
  name: "ManualChat",
  handlers: {
    *ask(message: string) {
      const messages = (yield* restate.state().get<Message[]>("messages")) ?? [];
      const result = yield* assistant.run(message, {messages});
      restate.state().set("messages", result.messages);
      if (result.status !== "completed") return result.output ?? result.reason;
      return result.output;
    },
  },
});
// <end_messages>

export const agents = {researcher, crawler};
