import * as restate from "@restatedev/restate-sdk";
import { RestatePromise } from "@restatedev/restate-sdk";
import { myService } from "./service";

function fetchOrderHistory(param: { userId: number }) {
  return Promise.resolve(undefined);
}

function fetchUserData(param: { userId: number }) {
  return Promise.resolve(undefined);
}

const service = restate.service({
  name: "SideEffects",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_side_effect>
      const result = await ctx.run<string>(async () => doDbRequest());
      // <end_side_effect>
    },

    promiseCombinatorsAll: async (ctx: restate.Context, name: string) => {
      // <start_all>
      const sleepPromise = ctx.sleep({ milliseconds: 100 });
      const callPromise = ctx.serviceClient(myService).myHandler("Hi");
      const externalCallPromise = ctx.run(() => httpCall());

      const resultArray = await RestatePromise.all([
        sleepPromise,
        callPromise,
        externalCallPromise,
      ]);
      // <end_all>
    },
    promiseCombinatorsAny: async (ctx: restate.Context, name: string) => {
      // <start_any>
      const sleepPromise1 = ctx.sleep({ milliseconds: 100 });
      const sleepPromise2 = ctx.sleep({ milliseconds: 200 });
      const callPromise = ctx.serviceClient(myService).myHandler("Hi");

      const firstResult = await RestatePromise.any([
        sleepPromise1,
        sleepPromise2,
        callPromise,
      ]);
      // <end_any>

      // <start_race>
      const sleepPromise3 = ctx.sleep({ milliseconds: 100 });
      const callPromise2 = ctx.serviceClient(myService).myHandler("Hi");

      const firstToComplete = await RestatePromise.race([
        sleepPromise3,
        callPromise2,
      ]);
      // <end_race>

      // <start_allSettled>
      const sleepPromise4 = ctx.sleep({ milliseconds: 100 });
      const callPromise3 = ctx.serviceClient(myService).myHandler("Hi");
      const externalCallPromise2 = ctx.run(() => httpCall());

      const allResults = await RestatePromise.allSettled([
        sleepPromise4,
        callPromise3,
        externalCallPromise2,
      ]);
      // <end_allSettled>

      // <start_parallel>
      const call1 = ctx.run("fetch_user", async () =>
        fetchUserData({ userId: 123 })
      );
      const call2 = ctx.run("fetch_orders", async () =>
        fetchOrderHistory({ userId: 123 })
      );
      const call3 = ctx
        .serviceClient(analyticsService)
        .calculateMetrics({ userId: 123 });

      const user = await call1;
      const orders = await call2;
      const metrics = await call3;
      // <end_parallel>

      // <start_uuid>
      const uuid = ctx.rand.uuidv4();
      // <end_uuid>

      // <start_random_nb>
      const randomNumber = ctx.rand.random();
      // <end_random_nb>

      // <start_time>
      const now = await ctx.date.now();
      // <end_time>
    },
  },
});

function doDbRequest() {
  return "";
}

async function httpCall() {
  return "";
}

const analyticsService = restate.service({
  name: "AnalyticsService",
  handlers: {
    calculateMetrics: async (ctx: restate.Context, req: { userId: number }) => {
      // Simulate some analytics calculation
      return 500;
    },
  },
});
