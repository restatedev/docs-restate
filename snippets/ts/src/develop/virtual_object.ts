import * as restate from "@restatedev/restate-sdk";

export const myObject = restate.object({
  name: "MyObject",
  handlers: {
    myHandler: async (ctx: restate.ObjectContext, greeting: string) => {
      return `${greeting} ${ctx.key}!`;
    },
    myConcurrentHandler: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext, greeting: string) => {
        return `${greeting} ${ctx.key}!`;
      }
    ),
  },
});

restate.serve({ services: [myObject] });
