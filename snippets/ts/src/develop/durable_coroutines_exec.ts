import type {Operation} from "@restatedev/restate-sdk-gen";
import {fetchOrders, fetchUser} from "./durable_coroutines_helpers";
import {gen, run} from "@restatedev/restate-sdk-gen";

// <start_execute>
import * as restate from "@restatedev/restate-sdk";
import {execute} from "@restatedev/restate-sdk-gen";

export const existingService = restate.service({
    name: "ExistingService",
    handlers: {
        summary: async (ctx: restate.Context, userId: string) =>
            execute(ctx, loadUserSummary(userId)),
    },
});
// <end_execute>


type UserSummary = { name: string; orderCount: number };

function loadUserSummary(userId: string): Operation<UserSummary> {
    return gen(function* () {
        const user = yield* run(() => fetchUser(userId), { name: "fetch-user" });
        const orders = yield* run(() => fetchOrders(user.id), {
            name: "fetch-orders",
        });
        return { name: user.name, orderCount: orders.length };
    });
}