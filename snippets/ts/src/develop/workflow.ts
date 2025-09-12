import * as restate from "@restatedev/restate-sdk";

export const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, req: string) => {
      // implement workflow logic here

      return "success";
    },

    interactWithWorkflow: async (ctx: restate.WorkflowSharedContext) => {
      // implement interaction logic here
      // e.g. resolve a promise that the workflow is waiting on
    },
  },
});

restate.serve({ services: [myWorkflow] });
