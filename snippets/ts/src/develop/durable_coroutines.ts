import {
  fetchUser,
  fetchOrders,
  recordAudit,
} from "./durable_coroutines_helpers";
import { type Operation } from "@restatedev/restate-sdk-gen";
import { TerminalError } from "@restatedev/restate-sdk";
// <start_imports>
import * as restate from "@restatedev/restate-sdk-gen";
// <end_imports>

// <start_basic>
export const userService = restate.service({
  name: "UserService",
  handlers: {
    *greet(userId: string): Operation<string> {
      const user = yield* restate.run(() => fetchUser(userId), {
        name: "fetch-user",
      });
      return `Hello, ${user.name}!`;
    },
  },
});
// <end_basic>

// <start_routine>
type UserSummary = { name: string; orderCount: number };

function loadUserSummary(userId: string): Operation<UserSummary> {
  return restate.gen(function* () {
    const user = yield* restate.run(() => fetchUser(userId), {
      name: "fetch-user",
    });
    const orders = yield* restate.run(() => fetchOrders(user.id), {
      name: "fetch-orders",
    });
    return { name: user.name, orderCount: orders.length };
  });
}
// <end_routine>

export const summaryService = restate.service({
  name: "SummaryService",
  handlers: {
    // <start_parallel>
    *summaries(userIds: string[]): Operation<UserSummary[]> {
      // <start_all>
      const tasks = userIds.map((id) => restate.spawn(loadUserSummary(id)));
      const summaries = yield* restate.all(tasks);
      // <end_all>
      return summaries;
    },
    // <end_parallel>

    *firstResult(userIds: string[]): Operation<UserSummary> {
      // <start_race>
      const tasks = userIds.map((id) => restate.spawn(loadUserSummary(id)));
      const first = yield* restate.race(tasks);
      // <end_race>
      return first;
    },

    *firstSuccess(userIds: string[]): Operation<UserSummary> {
      // <start_any>
      const tasks = userIds.map((id) => restate.spawn(loadUserSummary(id)));
      const firstSuccessful = yield* restate.any(tasks);
      // <end_any>
      return firstSuccessful;
    },

    *settled(
      userIds: string[]
    ): Operation<restate.FutureSettledResult<UserSummary>[]> {
      // <start_all_settled>
      const tasks = userIds.map((id) => restate.spawn(loadUserSummary(id)));
      const results = yield* restate.allSettled(tasks);
      // <end_all_settled>
      return results;
    },

    *selected(req: { firstId: string; secondId: string }): Operation<{
      tag: string;
      summary: UserSummary;
    }> {
      const { firstId, secondId } = req;
      // <start_select>
      const winner = yield* restate.select({
        first: restate.spawn(loadUserSummary(firstId)),
        second: restate.spawn(loadUserSummary(secondId)),
      });
      switch (winner.tag) {
        case "first":
          return { tag: "first", summary: yield* winner.future };
        case "second":
          return { tag: "second", summary: yield* winner.future };
      }
      // <end_select>
    },

    *withTimeout(req: {
      userId: string;
      budgetSeconds: number;
    }): Operation<UserSummary> {
      const { userId, budgetSeconds } = req;
      // <start_timeout>
      const summary = restate.spawn(loadUserSummary(userId));
      const winner = yield* restate.select({
        done: summary,
        timeout: restate.sleep({ seconds: budgetSeconds }),
      });
      if (winner.tag === "timeout") {
        throw new TerminalError("Loading the summary timed out");
      }
      return yield* winner.future;
      // <end_timeout>
    },
  },
});

// <start_context_local>
const requestId = restate.contextLocal<string>("unknown");

function loadAuditedSummary(userId: string): Operation<UserSummary> {
  return restate.gen(function* () {
    const id = requestId.get();
    yield* restate.run(() => recordAudit(id, userId), { name: "audit" });
    return yield* loadUserSummary(userId);
  });
}
// <end_context_local>

// <start_stop_worker>
function summarizeUntilStopped(
  userIds: string[],
  stop: restate.Channel<void>
): Operation<UserSummary[]> {
  return restate.gen(function* () {
    const results: UserSummary[] = [];
    for (const userId of userIds) {
      const next = yield* restate.select({
        stop: stop.receive,
        ready: restate.sleep({ milliseconds: 100 }),
      });
      if (next.tag === "stop") break;
      results.push(yield* loadUserSummary(userId));
    }
    return results;
  });
}
// <end_stop_worker>

export const coordinationService = restate.service({
  name: "CoordinationService",
  handlers: {
    *interruptWithCleanup(userId: string): Operation<void> {
      // <start_interrupt_cleanup>
      const work = restate.gen(function* () {
        try {
          yield* restate.sleep({ minutes: 1 });
        } finally {
          yield* restate.run(() => recordAudit("cleanup", userId), {
            name: "cleanup",
          });
        }
      });
      const task = restate.spawn(work);

      task.interrupt();
      try {
        yield* task; // Wait for the finally block to finish.
      } catch (error) {
        if (!(error instanceof restate.InterruptedError)) throw error;
      }
      // <end_interrupt_cleanup>
    },

    *auditedSummaries(req: {
      requestId: string;
      userIds: string[];
    }): Operation<UserSummary[]> {
      const { requestId: id, userIds } = req;
      // <start_context_handler>
      requestId.set(id);
      const tasks = userIds.map((id) => restate.spawn(loadAuditedSummary(id)));
      return yield* restate.all(tasks);
      // <end_context_handler>
    },

    *summariesWithBudget(req: {
      userIds: string[];
      budgetSeconds: number;
    }): Operation<UserSummary[]> {
      const { userIds, budgetSeconds } = req;
      // <start_stop_handler>
      const stop = restate.channel<void>();
      const worker = restate.spawn(summarizeUntilStopped(userIds, stop));
      const winner = yield* restate.select({
        done: worker,
        timeout: restate.sleep({ seconds: budgetSeconds }),
      });
      if (winner.tag === "timeout") {
        yield* stop.send();
      }
      return yield* worker;
      // <end_stop_handler>
    },
  },
});
