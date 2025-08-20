import * as restate from "@restatedev/restate-sdk";
import {TerminalError} from "@restatedev/restate-sdk";

restate.service({
    name: "TerminalErrorService",
    handlers: {
        run: async (ctx: restate.Context) => {
        // <start_terminal_error>
        throw new TerminalError("Invalid credit card");
        // <end_terminal_error>
        },
    },
})