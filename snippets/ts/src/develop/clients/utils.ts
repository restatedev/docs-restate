import * as restate from "@restatedev/restate-sdk";

export const greeterService = restate.service({
  name: "MyService",
  handlers: {
    greet: async (ctx: restate.Context, request: { greeting?: string }) => {
      return `Hello ${request.greeting}`;
    },
  },
});
export type MyService = typeof greeterService;

export const greetCounterObject = restate.object({
  name: "MyObject",
  handlers: {
    greet: async (
      ctx: restate.ObjectContext,
      request: { greeting?: string }
    ) => {
      let count = (await ctx.get<number>("count")) ?? 0;
      count++;
      ctx.set("count", count);
      return count;
    },
  },
});
export type MyObject = typeof greetCounterObject;

const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, req: { greeting: string }) => {
      // implement workflow logic here

      return "success";
    },

    myOtherHandler: async (ctx: restate.WorkflowSharedContext) => {
      // implement interaction logic here
      // e.g. resolve a promise that the workflow is waiting on
      return "Some other result";
    },
  },
});

export type MyWorkflow = typeof myWorkflow;
