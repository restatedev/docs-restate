import * as restate from "@restatedev/restate-sdk-gen";
import {agent, LazyStateConversation, tool, type ProgressEvent} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";

const support = agent({model, instructions: "Help the user with their support task."});

type ActiveTurn = {invocationId: string};

// <start_steering>
export const supportSession = restate.object({
  name: "SupportSession",
  handlers: {
    *chat(message: string) {
      restate.state().set("active", {invocationId: restate.handlerRequest().id});
      try {
        const result = yield* support.run(message, {
          conversation: new LazyStateConversation(),
          steeringSignal: "steering",
          interruptSignal: "interrupt",
        });
        if (result.status !== "completed") return result.output ?? result.reason;
        return result.output;
      } finally {
        restate.state().clear("active");
      }
    },
    *steer(message: string) {
      return yield* signalActiveTurn("steering", message);
    },
    *interrupt(reason: string) {
      return yield* signalActiveTurn("interrupt", reason);
    },
  },
  options: {
    state: {preload: ["conversation/meta", "conversation/summary", "active"]},
    handlers: {steer: {shared: true}, interrupt: {shared: true}},
  },
});

function* signalActiveTurn(name: string, value: string): restate.Operation<boolean> {
  const active = yield* restate.sharedState().get<ActiveTurn>("active");
  if (!active) return false;
  restate.invocation(active.invocationId).signal(name).resolve(value);
  return true;
}
// <end_steering>

// A minimal feed: each subscriber receives the next published event.
export const progressFeed = restate.object({
  name: "ProgressFeed",
  handlers: {
    *publish(event: ProgressEvent) {
      const subscribers = (yield* restate.state().get<string[]>("subscribers")) ?? [];
      for (const id of subscribers) restate.resolveAwakeable(id, event);
      restate.state().clear("subscribers");
    },
    *addSubscriber(id: string) {
      const subscribers = (yield* restate.state().get<string[]>("subscribers")) ?? [];
      restate.state().set("subscribers", [...subscribers, id]);
    },
    *subscribe() {
      const {id, promise} = restate.awakeable<ProgressEvent>();
      restate.sendClient(progressFeed, restate.handlerRequest().key!).addSubscriber(id);
      return yield* promise;
    },
  },
  options: {handlers: {subscribe: {shared: true}}},
});

// <start_tool_progress>
const auditor = agent({
  model,
  instructions: "Count stock with countStock, then name the warehouse with the least stock.",
  tools: {
    countStock: tool({
      description: "Count stock in the given warehouses.",
      input: z.object({warehouses: z.array(z.string()).max(10)}),
      *execute({warehouses}, context) {
        const counts: Record<string, number> = {};
        for (const warehouse of warehouses) {
          counts[warehouse] = warehouse.length * 7;
          yield* context.progress(`counted ${warehouse}`);
        }
        return counts;
      },
    }),
  },
});
// <end_tool_progress>

export const inventoryAudit = restate.service({
  name: "InventoryAudit",
  handlers: {
    *audit({job, request}: {job: string; request: string}) {
      // <start_progress>
      const feed = restate.sendClient(progressFeed, job);
      const result = yield* auditor.run(request, {
        *onProgress(event) {
          feed.publish(event); // a one-way send: the run does not wait for subscribers
        },
      });
      // <end_progress>
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});

declare function publishText(step: number, text: string): Promise<void>;
declare function clearText(step: number): Promise<void>;

// <start_stream>
import {openai} from "@ai-sdk/openai";
import {aiModel} from "@restatedev/agentlib/provider";

const streamingModel = aiModel({
  model: openai("gpt-5.6-luna"),
  async onChunk(event, {step}) {
    if (event.type === "start") await clearText(step); // a retried call starts over
    if (event.type === "text-delta") await publishText(step, event.text);
  },
});
// <end_stream>

export const models = {streamingModel};
