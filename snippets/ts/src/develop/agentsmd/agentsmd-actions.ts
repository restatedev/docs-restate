import * as restate from "@restatedev/restate-sdk";
import { RestatePromise } from "@restatedev/restate-sdk";
import { myService } from "../my_service";
import { myWorkflow } from "../workflow";
import { myObject } from "../virtual_object";

// Type definitions for examples
type UserProfile = {
  name: string;
  email: string;
};

type ShoppingCart = {};

type PaymentResult = {
  success: boolean;
  transactionId: string;
};

type InventoryResult = {
  available: boolean;
  quantity: number;
};

// Mock external functions
const fetch = async (url: string) => ({ json: () => Promise.resolve({}) });
async function updateUserDatabase(id: string, data: any) {
  return Promise.resolve(data);
}

// Mock services for examples
const ValidationService = restate.service({
  name: "ValidationService",
  handlers: {
    validateOrder: async (ctx: restate.Context, order: any) => ({
      valid: true,
    }),
  },
});

const NotificationService = restate.service({
  name: "NotificationService",
  handlers: {
    sendEmail: async (
      ctx: restate.Context,
      req: { userId: string; message: string }
    ) => {},
  },
});

const AnalyticsService = restate.service({
  name: "AnalyticsService",
  handlers: {
    recordEvent: async (ctx: restate.Context, event: any) => {},
  },
});

const ShoppingCartObject = restate.object({
  name: "ShoppingCartObject",
  handlers: {
    emtpyExpiredCart: async (ctx: restate.Context) => {},
  },
});

const ReminderService = restate.service({
  name: "ReminderService",
  handlers: {
    sendReminder: async (
      ctx: restate.Context,
      req: { userId: string; message: string }
    ) => {},
  },
});

const UserAccount = restate.object({
  name: "UserAccount",
  handlers: {
    getProfile: async (ctx: restate.ObjectContext) =>
      ({ name: "John" } as UserProfile),
  },
});

type Order = {};

const OrderWorkflow = restate.workflow({
  name: "OrderWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, order: Order) => {},
    getStatus: async (ctx: restate.WorkflowSharedContext) => "pending",
  },
});

async function callExternalAPI() {
  return Promise.resolve(undefined);
}

// Example service that demonstrates all actions
const ActionsExampleService = restate.service({
  name: "ActionsExample",
  handlers: {
    durableStepsExample: async (ctx: restate.Context, userId: string) => {
      // <start_durable_steps>
      const result = await ctx.run("my-side-effect", async () => {
        return await callExternalAPI();
      });
      // <end_durable_steps>
    },

    serviceCallsExample: async (
      ctx: restate.Context,
      { userId, orderId, order }: any
    ) => {
      // <start_service_calls>
      // Call a Service
      const response = await ctx.serviceClient(myService).myHandler("Hi");

      // Call a Virtual Object
      const response2 = await ctx.objectClient(myObject, "key").myHandler("Hi");

      // Call a Workflow
      const response3 = await ctx.workflowClient(myWorkflow, "wf-id").run("Hi");

      // <end_service_calls>
    },

    sendingMessagesExample: async (ctx: restate.Context, userId: string) => {
      // <start_generic_call>
      const response = await ctx.genericCall({
        service: "MyObject",
        method: "myHandler",
        parameter: "Hi",
        key: "Mary", // drop this for Service calls
        inputSerde: restate.serde.json,
        outputSerde: restate.serde.json,
      });
      // <end_generic_call>

      // <start_sending_messages>
      ctx.serviceSendClient(myService).myHandler("Hi");
      ctx.objectSendClient(myObject, "key").myHandler("Hi");
      ctx.workflowSendClient(myWorkflow, "wf-id").run("Hi");
      // <end_sending_messages>
    },

    delayedMessagesExample: async (
      ctx: restate.Context,
      { userId, message }: any
    ) => {
      // <start_delayed_messages>
      ctx
        .serviceSendClient(myService)
        .myHandler("Hi", restate.rpc.sendOpts({ delay: { hours: 5 } }));
      // <end_delayed_messages>
    },

    durableTimersExample: async (
      ctx: restate.Context,
      { userId, orderId, order }: any
    ) => {
      // <start_durable_timers>
      // Sleep
      await ctx.sleep({ seconds: 30 });

      // Schedule delayed call (different from sleep + send)
      ctx
        .serviceSendClient(myService)
        .myHandler("Hi", restate.rpc.sendOpts({ delay: { hours: 5 } }));
      // <end_durable_timers>
    },
  },
});

function requestHumanReview(name: any, id: string) {
  return undefined;
}

// Example Virtual Object that demonstrates state actions
const AwakeablesObject = restate.object({
  name: "AwakeablesExample",
  handlers: {
    stateGetExample: async (ctx: restate.ObjectContext) => {
      const name = "";
      // <start_awakeables>
      // Create awakeable
      const { id, promise } = ctx.awakeable<string>();

      // Send ID to external system
      await ctx.run(() => requestHumanReview(name, id));

      // Wait for result
      const review = await promise;

      // Resolve from another handler
      ctx.resolveAwakeable(id, "Looks good!");

      // Reject from another handler
      ctx.rejectAwakeable(id, "Cannot be reviewed");
      // <end_awakeables>

      // <start_state>
      // Get state
      const count = (await ctx.get<number>("count")) ?? 0;

      // Set state
      ctx.set("count", count + 1);

      // Clear state
      ctx.clear("count");
      ctx.clearAll();

      // Get all state keys
      const keys = await ctx.stateKeys();
      // <end_state>
    },
    all: async (ctx: restate.ObjectContext, prompt: string) => {
      const call1 = new Promise(() => callLLM("gpt-4", prompt));
      const call2 = new Promise(() => callLLM("claude", prompt));
      // <start_promise_all>
      // ❌ BAD
      const results1 = await Promise.all([call1, call2]);

      // ✅ GOOD
      const claude = ctx.serviceClient(claudeAgent).ask("What is the weather?");
      const openai = ctx.serviceClient(openAiAgent).ask("What is the weather?");
      const results2 = await RestatePromise.all([claude, openai]);
      // <end_promise_all>
    },
    race: async (ctx: restate.ObjectContext, prompt: string) => {
      const call1 = new Promise(() => callLLM("gpt-4", prompt));
      const call2 = new Promise(() => callLLM("claude", prompt));
      // <start_promise_race>
      // ❌ BAD
      const result1 = await Promise.race([call1, call2]);

      // ✅ GOOD
      const firstToComplete = await RestatePromise.race([
        ctx.sleep({ milliseconds: 100 }),
        ctx.serviceClient(myService).myHandler("Hi"),
      ]);
      // <end_promise_race>
    },
    any: async (ctx: restate.ObjectContext, prompt: string) => {
      const call1 = new Promise(() => callLLM("gpt-4", prompt));
      const call2 = new Promise(() => callLLM("claude", prompt));

      // <start_promise_any>
      // ❌ BAD - using Promise.any (not journaled)
      const result1 = await Promise.any([call1, call2]);

      // ✅ GOOD
      const result2 = await RestatePromise.any([
        ctx.run(() => callLLM("gpt-4", prompt)),
        ctx.run(() => callLLM("claude", prompt)),
      ]);
      // <end_promise_any>
    },
    allSettled: async (ctx: restate.ObjectContext, prompt: string) => {
      const call1 = new Promise(() => callLLM("gpt-4", prompt));
      const call2 = new Promise(() => callLLM("claude", prompt));
      // <start_promise_allsettled>
      // ❌ BAD
      const results1 = await Promise.allSettled([call1, call2]);

      // ✅ GOOD
      const results2 = await RestatePromise.allSettled([
        ctx.serviceClient(service1).call(),
        ctx.serviceClient(service2).call(),
      ]);

      results2.forEach((result, i) => {
        if (result.status === "fulfilled") {
          console.log(`Call ${i} succeeded:`, result.value);
        } else {
          console.log(`Call ${i} failed:`, result.reason);
        }
      });
      // <end_promise_allsettled>
    },
    message: async (ctx: restate.ObjectContext, prompt: string) => {
      // <start_cancel>
      const handle = ctx
        .serviceSendClient(myService)
        .myHandler("Hi", restate.rpc.sendOpts({ idempotencyKey: "my-key" }));
      const invocationId = await handle.invocationId;
      const response = await ctx.attach(invocationId);

      // Cancel invocation
      ctx.cancel(invocationId);
      // <end_cancel>
    },
  },
});

// Example Workflow that demonstrates workflow actions
const WorkflowExampleWorkflow = restate.workflow({
  name: "WorkflowExample",
  handlers: {
    run: async (ctx: restate.WorkflowContext) => {
      // <start_workflow_promises>
      // Wait for promise
      const review = await ctx.promise<string>("review");

      // Resolve promise
      await ctx.promise<string>("review").resolve(review);
      // <end_workflow_promises>
    },
  },
});

function callLLM(arg0: string, prompt: any): any {
  throw new Error("Function not implemented.");
}

const claudeAgent = restate.service({
  name: "ClaudeAgent",
  handlers: {
    ask: async (ctx: restate.Context, question: string) => {
      return "42";
    },
  },
});

const openAiAgent = restate.service({
  name: "OpenAIAgent",
  handlers: {
    ask: async (ctx: restate.Context, question: string) => {
      return "42";
    },
  },
});

const service1 = restate.service({
  name: "Service1",
  handlers: {
    call: async (ctx: restate.Context) => {
      return "done";
    },
  },
});

const service2 = restate.service({
  name: "Service1",
  handlers: {
    call: async (ctx: restate.Context) => {
      return "done";
    },
  },
});
