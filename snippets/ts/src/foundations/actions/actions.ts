import * as restate from "@restatedev/restate-sdk";
import { v4 as uuid } from "uuid";
import { rpc, WorkflowSharedContext } from "@restatedev/restate-sdk";
import sendOpts = rpc.sendOpts;

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
    sendEmail: async (ctx: restate.Context, req: { userId: string; message: string }) => {},
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
    sendReminder: async (ctx: restate.Context, req: { userId: string; message: string }) => {},
  },
});

const UserAccount = restate.object({
  name: "UserAccount",
  handlers: {
    getProfile: async (ctx: restate.ObjectContext) => ({ name: "John" } as UserProfile),
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

// Example service that demonstrates all actions
const ActionsExampleService = restate.service({
  name: "ActionsExample",
  handlers: {
    durableStepsExample: async (ctx: restate.Context, userId: string) => {
      // <start_durable_steps>
      // External API call
      const apiResult = await ctx.run("fetch-data", async () => {
        const response = await fetch("https://api.example.com/data");
        return response.json();
      });

      // Database operation
      const dbResult = await ctx.run("update-user", () => {
        return updateUserDatabase(userId, { name: "John" });
      });

      // Idempotency key generation
      const id = await ctx.run("generate-id", () => uuid());
      // <end_durable_steps>
    },

    serviceCallsExample: async (ctx: restate.Context, { userId, orderId, order }: any) => {
      // <start_service_calls>
      // Call another service
      const validation = await ctx.serviceClient(ValidationService).validateOrder(order);

      // Call Virtual Object function
      const profile = await ctx.objectClient(UserAccount, userId).getProfile();

      // Submit Workflow
      const result = await ctx.workflowClient(OrderWorkflow, orderId).run(order);
      // <end_service_calls>
    },

    sendingMessagesExample: async (ctx: restate.Context, userId: string) => {
      // <start_sending_messages>
      // Fire-and-forget notification
      ctx.serviceSendClient(NotificationService).sendEmail({ userId, message: "Welcome!" });

      // Background analytics
      ctx.serviceSendClient(AnalyticsService).recordEvent({ kind: "user_signup", userId });

      // Cleanup task
      ctx.objectSendClient(ShoppingCartObject, userId).emtpyExpiredCart();
      // <end_sending_messages>
    },

    delayedMessagesExample: async (ctx: restate.Context, { userId, message }: any) => {
      // <start_delayed_messages>
      // Schedule reminder for tomorrow
      ctx.serviceSendClient(ReminderService).sendReminder(
        { userId, message },
        sendOpts({
          delay: { days: 1 },
        })
      );
      // <end_delayed_messages>
    },

    durableTimersExample: async (ctx: restate.Context, { userId, orderId, order }: any) => {
      // <start_durable_timers>
      // Sleep for specific duration
      await ctx.sleep({ minutes: 5 }); // 5 minutes

      // Wait for action or timeout
      const result = await ctx
        .workflowClient(OrderWorkflow, orderId)
        .run(order)
        .orTimeout({ minutes: 5 });
      // <end_durable_timers>
    },
  },
});

// Example Virtual Object that demonstrates state actions
const StateExampleObject = restate.object({
  name: "StateExample",
  handlers: {
    stateGetExample: async (ctx: restate.ObjectContext) => {
      // <start_state_get>
      // Get with type and default value
      const profile = await ctx.get<UserProfile>("profile");
      const count = (await ctx.get<number>("count")) ?? 0;
      const cart = (await ctx.get<ShoppingCart>("cart")) ?? [];
      // <end_state_get>
    },

    stateSetExample: async (ctx: restate.ObjectContext, count: number) => {
      // <start_state_set>
      // Store simple values
      ctx.set("lastLogin", ctx.date.toJSON());
      ctx.set("count", count + 1);

      // Store complex objects
      ctx.set("profile", {
        name: "John Doe",
        email: "john@example.com",
      });
      // <end_state_set>
    },

    stateClearExample: async (ctx: restate.ObjectContext) => {
      // <start_state_clear>
      // Clear specific keys
      ctx.clear("shoppingCart");
      ctx.clear("sessionToken");

      // Clear all user data
      ctx.clearAll();
      // <end_state_clear>
    },
  },
});

// Example Workflow that demonstrates workflow actions
const WorkflowExampleWorkflow = restate.workflow({
  name: "WorkflowExample",
  handlers: {
    run: async (ctx: restate.WorkflowContext) => {
      // <start_workflow_promises>
      // Wait for external event
      const paymentResult = await ctx.promise<PaymentResult>("payment-completed");

      // Wait for human approval
      const approved = await ctx.promise<boolean>("manager-approval");

      // Wait for multiple events
      const [payment, inventory] = await Promise.all([
        ctx.promise<PaymentResult>("payment"),
        ctx.promise<InventoryResult>("inventory"),
      ]);
      // <end_workflow_promises>
    },

    // <start_signal_functions>
    // In a signal function
    confirmPayment: async (ctx: WorkflowSharedContext, result: PaymentResult) => {
      await ctx.promise("payment-completed").resolve(result);
    },

    // In a signal function
    approveRequest: async (ctx: WorkflowSharedContext, approved: boolean) => {
      await ctx.promise("manager-approval").resolve(approved);
    },
    // <end_signal_functions>
  },
});

export { ActionsExampleService, StateExampleObject, WorkflowExampleWorkflow };
