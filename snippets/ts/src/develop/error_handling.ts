import { TerminalError } from "@restatedev/restate-sdk";
import * as restate from "@restatedev/restate-sdk";

const service = restate.service({
  name: "ErrorHandling",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_terminal>
      throw new TerminalError("Something went wrong.", { errorCode: 500 });
      // <end_terminal>
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
    }
  },
  options: {
    asTerminalError: (err) => {
      if (err instanceof MyValidationError) {
        // My validation error is terminal
        return new restate.TerminalError(err.message, {errorCode: 400})
      }
    }
  }
});
// <end_as_terminal>
