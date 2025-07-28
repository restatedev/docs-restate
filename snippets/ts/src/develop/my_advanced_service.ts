import * as restate from "@restatedev/restate-sdk";

// <start_options>
restate.service({
  name: "MyService",
  // This description is exposed via the OpenAPI spec
  // and visible in the Restate UI.
  description: "An example service that doesn't do anything.",
  handlers: {
    run: async (ctx: restate.Context) => {},
  },
  options: {
    // Specify your service options here
  }
});
// <end_options>

restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context) => {},
  },
  // <start_timeout>
  options: {
      abortTimeout: { minutes: 15 },
      inactivityTimeout: { minutes: 15 }
  }
  // <end_timeout>
});

restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context) => {},
  },
  // <start_idempotency>
  options: {
      idempotencyRetention: { days: 3 }
  }
  // <end_idempotency>
});

restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context) => {},
  },
  // <start_journal>
  options: {
      journalRetention: { days: 7 }
  }
  // <end_journal>
});

restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context) => {},
  },
  // <start_private>
  options: {
      ingressPrivate: true
  }
  // <end_private>
});





