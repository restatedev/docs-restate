import * as restate from "@restatedev/restate-sdk-gen";
import {TerminalError} from "@restatedev/restate-sdk";
import {agent, LazyStateConversation, messagesOf, type Message} from "@restatedev/agentlib";
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
    *history({from, limit}: {from?: number; limit?: number}) {
      return yield* new LazyStateConversation().page(from, limit);
    },
  },
  options: {handlers: {history: {shared: true}}},
});
// <end_conversation>

// The handlers of the lazy state example, as on the steering page.
function* doTurn(message: string) {
  restate.state().set("active", {invocationId: restate.handlerRequest().id});
  try {
    const result = yield* assistant.run(message, {
      conversation: new LazyStateConversation(),
      steeringSignal: "steering",
      interruptSignal: "interrupt",
    });
    if (result.status !== "completed") return result.output ?? result.reason;
    return result.output;
  } finally {
    restate.state().clear("active");
  }
}

function* history({from, limit}: {from?: number; limit?: number}) {
  return yield* new LazyStateConversation().page(from, limit);
}

function* signalActiveTurn(name: string, value: string): restate.Operation<boolean> {
  const active = yield* restate.sharedState().get<{invocationId: string}>("active");
  if (!active) return false;
  restate.invocation(active.invocationId).signal(name).resolve(value);
  return true;
}

function* steer(message: string) {
  return yield* signalActiveTurn("steering", message);
}

function* interrupt(reason: string) {
  return yield* signalActiveTurn("interrupt", reason);
}

// <start_lazy_state>
export const aiSession = restate.object({
  name: "AiSession",
  handlers: {doTurn, history, steer, interrupt},
  options: {
    state: {preload: false}, // fetch conversation chunks when they are read
    handlers: {history: {shared: true}, steer: {shared: true}, interrupt: {shared: true}},
  },
});
// <end_lazy_state>

// <start_conversation_compaction>
const longChat = agent({
  model,
  instructions: "Use the conversation to remember what the user told you.",
  compaction: {maxTokens: 64000},
});

export const compactedChat = restate.object({
  name: "CompactedChat",
  handlers: {
    *ask(message: string) {
      // The run stores its summaries in the conversation
      const result = yield* longChat.run(message, {conversation: new LazyStateConversation()});
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});
// <end_conversation_compaction>

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
      try {
        const result = yield* assistant.run(message, {messages});
        restate.state().set("messages", result.messages);
        if (result.status !== "completed") return result.output ?? result.reason;
        return result.output;
      } catch (error) {
        // Keep the failed turn, with a note on why it failed. Restate retries other errors.
        const failed = messagesOf(error);
        if (failed && error instanceof TerminalError) restate.state().set("messages", failed);
        throw error;
      }
    },
  },
});
// <end_messages>

export const agents = {researcher, crawler};
