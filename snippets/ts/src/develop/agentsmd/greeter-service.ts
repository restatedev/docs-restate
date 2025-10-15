import * as restate from "@restatedev/restate-sdk";
import {Context} from "@restatedev/restate-sdk";

export const greeter = restate.object({
    name: "Greeter",
    handlers: {
        greet: async (ctx: Context, name: string) => {

        },
    },
});