import * as restate from "@restatedev/restate-sdk";

// <start_api_export>
export const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context, greeting: string) => {
      return `${greeting}!`;
    },
  },
});

export type MyService = typeof myService;
// <end_api_export>

restate.serve({ services: [myService] });
