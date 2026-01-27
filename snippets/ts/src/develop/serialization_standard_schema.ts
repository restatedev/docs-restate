import { Context, WorkflowContext } from "@restatedev/restate-sdk";

// <start_standard_schema>
import * as restate from "@restatedev/restate-sdk";
import { z } from "zod";

const Greeting = z.object({
  name: z.string(),
});

const GreetingResponse = z.object({
  result: z.string(),
});

const greeter = restate.service({
  name: "Greeter",
  handlers: {
    greet: restate.handlers.handler(
      {
        input: restate.serde.schema(Greeting),
        output: restate.serde.schema(GreetingResponse),
      },
      async (ctx: restate.Context, { name }) => {
        return { result: `You said hi to ${name}!` };
      }
    ),
  },
});
// <end_standard_schema>
