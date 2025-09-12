import * as restate from "@restatedev/restate-sdk";

export const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context, greeting: string) => {
      return `${greeting}!`;
    },
  },
});

restate.serve({ services: [myService] });
