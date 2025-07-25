import * as restate from "@restatedev/restate-sdk";

const service = restate.service({
  name: "Awakeable",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_here>
      const { id, promise } = ctx.awakeable<string>();
      await ctx.run(() => triggerTaskAndDeliverId(id));
      const payload = await promise;
      // <end_here>

      // <start_resolve>
      ctx.resolveAwakeable(id, "hello");
      // <end_resolve>

      // <start_reject>
      ctx.rejectAwakeable(id, "my error reason");
      // <end_reject>
    },
  },
});

function triggerTaskAndDeliverId(awakeableId: string) {
  return "123";
}
