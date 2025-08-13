import * as restate from "@restatedev/restate-sdk";
import type { Duration } from "@restatedev/restate-sdk-core";

// <start_options>
restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: async (ctx: restate.Context) => {},
  },
  options: {
    abortTimeout: { minutes: 15 },
    inactivityTimeout: { minutes: 15 },
    idempotencyRetention: { days: 3 },
    journalRetention: { days: 7 },
    ingressPrivate: true,
    enableLazyState: true, // only for Virtual Objects and Workflows
    workflowRetention: { days: 3 }, // only for workflows
  },
});
// <end_options>

// <start_handleropts_service>
restate.service({
  name: "MyService",
  handlers: {
    myHandler: restate.handlers.handler(
      {
        abortTimeout: { minutes: 15 },
        inactivityTimeout: { minutes: 15 },
        idempotencyRetention: { days: 3 },
        journalRetention: { days: 7 },
        ingressPrivate: true,
      },
      async (ctx: restate.Context) => {}
    ),
  },
});
// <end_handleropts_service>

// <start_handleropts_object>
restate.object({
  name: "MyService",
  handlers: {
    myHandler: restate.handlers.object.exclusive(
      {
        abortTimeout: { minutes: 15 },
        inactivityTimeout: { minutes: 15 },
        idempotencyRetention: { days: 3 },
        journalRetention: { days: 7 },
        ingressPrivate: true,
        enableLazyState: true,
      },
      async (ctx: restate.Context) => {}
    ),
    mySharedHandler: restate.handlers.object.shared(
      {
        /*... my options ...*/
      },
      async (ctx: restate.Context) => {}
    ),
  },
});
// <end_handleropts_object>

// <start_handleropts_workflow>
restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: restate.handlers.workflow.workflow(
      {
        abortTimeout: { minutes: 15 },
        inactivityTimeout: { minutes: 15 },
        idempotencyRetention: { days: 3 },
        journalRetention: { days: 7 },
        ingressPrivate: true,
        enableLazyState: true,
      },
      async (ctx: restate.Context) => {}
    ),
    signal: restate.handlers.workflow.shared(
      {
        /*... my options ...*/
      },
      async (ctx: restate.Context) => {}
    ),
  },
});
// <end_handleropts_workflow>
