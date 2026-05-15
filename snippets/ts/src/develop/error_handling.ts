import { TerminalError, RetryableError } from "@restatedev/restate-sdk";
import * as restate from "@restatedev/restate-sdk";

const service = restate.service({
  name: "ErrorHandling",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_terminal>
      throw new TerminalError("Something went wrong.", { errorCode: 500 });
      // <end_terminal>
    },
    retryable: async (ctx: restate.Context, name: string) => {
      // <start_retryable>
      await ctx.run("call API", async () => {
          const res = await fetch("https://api.example.com/data");
          if (!res.ok) {
              const retryAfter = res.headers.get("Retry-After");
              throw new RetryableError("Rate limited", {
                  retryAfter: { seconds: Number(retryAfter ?? 30) },
              });
          }
          return res.json();
      }, { maxRetryAttempts: 10 });
      // <end_retryable>
    },
    retryableFrom: async (ctx: restate.Context, name: string) => {
      const cause = new Error("something failed");
      // <start_retryable_from>
      throw RetryableError.from(cause, {
          retryAfter: { seconds: 30 },
      });
      // <end_retryable_from>
    },
  },
});

// <start_as_terminal>
class MyValidationError extends Error {}

const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      if (name.length === 0) {
        throw new MyValidationError("Length too short");
      }
      return `Hello ${name}`;
    },
  },
  options: {
    asTerminalError: (err) => {
      if (err instanceof MyValidationError) {
        // My validation error is terminal
        return new restate.TerminalError(err.message, { errorCode: 400 });
      }
    },
  },
});
// <end_as_terminal>
