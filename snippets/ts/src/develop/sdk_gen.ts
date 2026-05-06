import * as restate from "@restatedev/restate-sdk";
import {
  gen,
  execute,
  run,
  sleep,
  all,
  race,
  any,
  allSettled,
  select,
  awakeable,
  spawn,
  channel,
  state,
  sharedState,
  workflowPromise,
  serviceClient,
  objectClient,
} from "@restatedev/restate-sdk-gen";

declare function fetchA(signal?: AbortSignal): Promise<string>;
declare function fetchB(signal?: AbortSignal): Promise<string>;
declare function fetchData(): Promise<string>;
declare function processItem(item: string): Promise<string>;
declare function doStep(i: number): Promise<string>;
declare function reserveItem(id: string): Promise<{ id: string }>;
declare function chargeCard(amount: number): Promise<{ id: string }>;
declare function createOrder(rId: string, cId: string): Promise<string>;
declare function releaseItem(id: string): Promise<void>;
declare function auditCancel(): Promise<void>;

// <start_quick_start>
const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const a = run(({ signal }) => fetchA(signal), { name: "a" });
          const b = run(({ signal }) => fetchB(signal), { name: "b" });
          const [aVal, bVal] = yield* all([a, b]);
          return `${aVal}+${bVal} for ${name}`;
        })
      ),
  },
});

restate.endpoint().bind(greeter).listen();
// <end_quick_start>

// <start_run_basic>
async function sequentialSteps(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      // Each run() is a journaled step. On replay, the recorded value is
      // returned without re-executing the closure.
      const a = yield* run(async () => fetchData(), { name: "step-a" });
      const b = yield* run(async () => fetchData(), { name: "step-b" });
      return `${a}-${b}`;
    })
  );
}
// <end_run_basic>

// <start_run_signal>
async function runWithSignal(ctx: restate.Context, url: string) {
  return execute(
    ctx,
    gen(function* () {
      // Pass signal into AbortSignal-aware APIs to cancel in-flight calls
      // immediately when invocation cancellation arrives.
      const data = yield* run(
        async ({ signal }) => {
          const r = await fetch(url, { signal });
          return r.json();
        },
        { name: "fetch" }
      );
      return data;
    })
  );
}
// <end_run_signal>

// <start_run_retry>
async function runWithRetry(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      const result = yield* run(async () => fetchData(), {
        name: "call",
        retry: {
          maxAttempts: 5,
          initialInterval: { seconds: 1 },
          maxInterval: { seconds: 30 },
        },
      });
      return result;
    })
  );
}
// <end_run_retry>

// <start_all>
async function parallelWork(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      // Futures are constructed immediately; work starts right away.
      const aF = run(() => fetchA(), { name: "a" });
      const bF = run(() => fetchB(), { name: "b" });
      // Wait for both to complete, results in input order.
      const [a, b] = yield* all([aF, bF]);
      return `${a}-${b}`;
    })
  );
}
// <end_all>

// <start_race>
async function raceWork(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      // Returns the first to settle; the loser keeps running.
      const winner = yield* race([
        run(() => fetchA(), { name: "primary" }),
        run(() => fetchB(), { name: "fallback" }),
      ]);
      return winner;
    })
  );
}
// <end_race>

// <start_select>
async function selectWork(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      // Like race, but with a discriminating tag.
      const r = yield* select({
        fast: run(() => fetchA(), { name: "fast" }),
        slow: run(() => fetchB(), { name: "slow" }),
      });
      switch (r.tag) {
        case "fast":
          return `fast: ${yield* r.future}`;
        case "slow":
          return `slow: ${yield* r.future}`;
      }
    })
  );
}
// <end_select>

// <start_timeout>
async function withTimeout(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      const r = yield* select({
        done: run(() => fetchData(), { name: "call" }),
        timeout: sleep({ seconds: 5 }),
      });
      if (r.tag === "timeout") {
        throw new restate.TerminalError("timed out");
      }
      return yield* r.future;
    })
  );
}
// <end_timeout>

// <start_spawn>
async function spawnConcurrentWorkflows(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      // spawn() runs an Operation as a concurrent sub-routine.
      const t1 = yield* spawn(
        gen(function* () {
          return yield* run(() => fetchA(), { name: "workflow-a" });
        })
      );
      const t2 = yield* spawn(
        gen(function* () {
          return yield* run(() => fetchB(), { name: "workflow-b" });
        })
      );
      // Both run in parallel; wait for both.
      const a = yield* t1;
      const b = yield* t2;
      return `${a}+${b}`;
    })
  );
}
// <end_spawn>

// <start_channel>
async function channelCoopStop(ctx: restate.Context, items: string[]) {
  return execute(
    ctx,
    gen(function* () {
      const stop = channel<void>();

      const worker = gen(function* () {
        const collected: string[] = [];
        for (let i = 0; i < items.length; i++) {
          const r = yield* select({
            done: run(() => processItem(items[i]), { name: `step-${i}` }),
            stop: stop.receive,
          });
          if (r.tag === "stop") {
            return `stopped-after:${collected.join(",")}`;
          }
          collected.push(yield* r.future);
        }
        return `complete:${collected.join(",")}`;
      });

      const t = yield* spawn(worker);

      // Signal the worker to stop after a timeout.
      yield* select({
        done: t,
        timeout: sleep({ seconds: 10 }),
      });
      yield* stop.send();

      return yield* t;
    })
  );
}
// <end_channel>

// <start_saga>
async function reserveAndCharge(
  ctx: restate.Context,
  itemId: string,
  amount: number
) {
  return execute(
    ctx,
    gen(function* () {
      const reservation = yield* run(() => reserveItem(itemId), {
        name: "reserve",
      });
      try {
        const charge = yield* run(() => chargeCard(amount), { name: "charge" });
        const orderId = yield* run(
          () => createOrder(reservation.id, charge.id),
          { name: "create-order" }
        );
        return { orderId };
      } catch (e) {
        // Compensation: release the reservation, then re-throw.
        yield* run(() => releaseItem(reservation.id), { name: "release" });
        throw e;
      }
    })
  );
}
// <end_saga>

// <start_cancellation>
async function withCancellationHandling(ctx: restate.Context) {
  return execute(
    ctx,
    gen(function* () {
      try {
        return yield* run(() => fetchData(), { name: "call" });
      } catch (e) {
        if (e instanceof restate.TerminalError && e.code === 409) {
          // CancelledError is a TerminalError with code 409.
          // Run journaled cleanup; cancellation is not sticky.
          yield* run(async () => auditCancel(), { name: "audit-cancel" });
        }
        throw e;
      }
    })
  );
}
// <end_cancellation>

// <start_state>
type MyState = { counter: number; name: string };

const myObject = restate.object({
  name: "myObject",
  handlers: {
    increment: async (ctx: restate.ObjectContext): Promise<number> =>
      execute(
        ctx,
        gen(function* () {
          const s = state<MyState>();
          const current = (yield* s.get("counter")) ?? 0;
          s.set("counter", current + 1);
          return current + 1;
        })
      ),

    get: async (ctx: restate.ObjectSharedContext): Promise<number> =>
      execute(
        ctx,
        gen(function* () {
          return (yield* sharedState<MyState>().get("counter")) ?? 0;
        })
      ),
  },
});
// <end_state>

// <start_workflow_promise>
const myWorkflow = restate.workflow({
  name: "myWorkflow",
  handlers: {
    run: async (
      ctx: restate.WorkflowContext,
      input: string
    ): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          state().set("input", input);
          // Park until an external call resolves this promise.
          const value = yield* workflowPromise<string>("done").get();
          return value;
        })
      ),

    unblock: async (
      ctx: restate.WorkflowSharedContext,
      result: string
    ): Promise<void> =>
      execute(
        ctx,
        gen(function* () {
          yield* workflowPromise<string>("done").resolve(result);
        })
      ),
  },
});
// <end_workflow_promise>
