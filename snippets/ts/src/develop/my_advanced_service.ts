import * as restate from "@restatedev/restate-sdk";

// <start_options>
restate.service({
  name: "MyService",
  handlers: {
    run: async (ctx: restate.Context) => {},
  },
  options: {
      abortTimeout: { minutes: 15 },
      inactivityTimeout: { minutes: 15 },
      idempotencyRetention: { days: 3 },
      journalRetention: { days: 7 },
      ingressPrivate: true
  }
});
// <end_options>

// <start_handleropts>
restate.service({
    name: "MyService",
    handlers: {
        run: restate.handlers.handler(
            {
                abortTimeout: { minutes: 15 },
                inactivityTimeout: { minutes: 15 },
                idempotencyRetention: { days: 3 },
                journalRetention: { days: 7 },
                ingressPrivate: true
            },
            async (ctx: restate.Context) => {},
        )
    }
});
// <end_handleropts>

