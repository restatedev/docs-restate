import type { Operation } from "@restatedev/restate-sdk-gen";
import { fetchOrders, fetchUser } from "./durable_coroutines_helpers";

// <start_execute>
import * as sdk from "@restatedev/restate-sdk";
import * as restate from "@restatedev/restate-sdk-gen";

export const existingService = sdk.service({
  name: "ExistingService",
  handlers: {
    summary: async (ctx: sdk.Context, userId: string) =>
      restate.execute(ctx, loadUserSummary(userId)),
  },
});
// <end_execute>

export const concurrentService = sdk.service({
  name: "ConcurrentService",
  handlers: {
    // <start_execute_parallel>
    summaries: async (ctx: sdk.Context, userIds: string[]) =>
      restate.execute(ctx, restate.gen(function* () {
        const tasks = userIds.map((id) => restate.spawn(loadUserSummary(id)));
        return yield* restate.all(tasks);
      })),
    // <end_execute_parallel>
  },
});

type UserSummary = { name: string; orderCount: number };

function loadUserSummary(userId: string): Operation<UserSummary> {
  return restate.gen(function* () {
    const user = yield* restate.run(() => fetchUser(userId), { name: "fetch-user" });
    const orders = yield* restate.run(() => fetchOrders(user.id), {
      name: "fetch-orders",
    });
    return { name: user.name, orderCount: orders.length };
  });
}
