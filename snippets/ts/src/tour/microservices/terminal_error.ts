import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";

async function throwError(ctx: restate.Context) {
  // <start_terminal_error>
  throw new TerminalError("Invalid credit card");
  // <end_terminal_error>
}
