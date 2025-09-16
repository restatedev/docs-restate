import * as restate from "@restatedev/restate-sdk";
import type { Duration } from "@restatedev/restate-sdk-core";

// <start_options>
// Add service options to the service definition
const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: async (ctx: restate.Context) => {},
  },
  options: {
    retryPolicy: {
      initialInterval: { seconds: 1 },
      maxInterval: { seconds: 30 },
      maxAttempts: 10,
      onMaxAttempts: "pause"
    },
    abortTimeout: { minutes: 15 },
    inactivityTimeout: { minutes: 15 },
    idempotencyRetention: { days: 3 },
    workflowRetention: { days: 3 }, // only for workflows
    journalRetention: { days: 7 },
    ingressPrivate: true,
    enableLazyState: true, // only for Virtual Objects and Workflows
  },
});
// <end_options>

// <start_handleropts>
// Add handler options to the handler definition
// For services:
const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: restate.handlers.handler(
      {
        retryPolicy: {
          initialInterval: { seconds: 1 },
          maxInterval: { seconds: 30 },
          maxAttempts: 10,
          onMaxAttempts: "pause"
        },
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

// For Virtual Objects:
const myObject = restate.object({
  name: "MyObject",
  handlers: {
    myHandler: restate.handlers.object.exclusive(
      {
        retryPolicy: {
          initialInterval: { seconds: 1 },
          maxInterval: { seconds: 30 },
          maxAttempts: 10,
          onMaxAttempts: "pause"
        },
        abortTimeout: { minutes: 15 },
        inactivityTimeout: { minutes: 15 },
        idempotencyRetention: { days: 3 },
        journalRetention: { days: 7 },
        ingressPrivate: true,
        enableLazyState: true,
      },
      async (ctx: restate.ObjectContext) => {}
    ),
    mySharedHandler: restate.handlers.object.shared(
      {
        /*... my options ...*/
      },
      async (ctx: restate.ObjectSharedContext) => {}
    ),
  },
});

// For Workflows:
const myWf = restate.workflow({
  name: "MyWf",
  handlers: {
    run: restate.handlers.workflow.workflow(
      {
        retryPolicy: {
          initialInterval: { seconds: 1 },
          maxInterval: { seconds: 30 },
          maxAttempts: 10,
          onMaxAttempts: "pause"
        },
        abortTimeout: { minutes: 15 },
        inactivityTimeout: { minutes: 15 },
        journalRetention: { days: 7 },
        ingressPrivate: true,
        enableLazyState: true,
      },
      async (ctx: restate.WorkflowContext) => {}
    ),
    signal: restate.handlers.workflow.shared(
      {
        /*... my options ...*/
      },
      async (ctx: restate.WorkflowSharedContext) => {}
    ),
  },
});
// <end_handleropts>

restate.serve({
  services: [myObject, myWf, myService, myWorkflow],
});
