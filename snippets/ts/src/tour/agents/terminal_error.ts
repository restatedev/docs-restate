import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";

async function throwError(ctx: restate.Context) {
  // <start_terminal_error>
  throw new TerminalError("This tool is not allowed to run for this input.");
  // <end_terminal_error>
}
