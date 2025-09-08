import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";

// <start_here>
export const userAccount = restate.object({
  name: "UserAccount",
  handlers: {
    updateBalance: async (ctx: restate.ObjectContext, amount: number) => {
      const balance = (await ctx.get<number>("balance")) ?? 0;
      const newBalance = balance + amount;

      if (newBalance < 0) {
        throw new TerminalError("Insufficient funds");
      }

      ctx.set("balance", newBalance);
      return newBalance;
    },

    getBalance: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext) => {
        return (await ctx.get<number>("balance")) ?? 0;
      }
    ),
  },
});
// <end_here>
