/*
 * Code snippets for the @restatedev/restate-sdk-gen documentation.
 * All examples are inside gen(function*() { ... }) bodies unless noted.
 */

// <start_install>
// npm install @restatedev/restate-sdk @restatedev/restate-sdk-gen
// <end_install>

// <start_hello_world>
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run, sleep, all, race } from "@restatedev/restate-sdk-gen";

const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string) =>
      execute(
        ctx,
        gen(function* () {
          const greeting = yield* run(
            async () => `Hello, ${name}!`,
            { name: "compose-greeting" }
          );
          return greeting;
        })
      ),
  },
});

restate.serve({ services: [greeter] });
// <end_hello_world>

// <start_sequential>
import { run as runStep } from "@restatedev/restate-sdk-gen";

// Inside gen(function*() { ... }):
const sequentialExample = gen(function* () {
  const a = yield* runStep(
    () => fetch("/a").then((r) => r.text()),
    { name: "step-a" }
  );
  const b = yield* runStep(
    () => fetch("/b").then((r) => r.text()),
    { name: "step-b" }
  );
  return `${a}-${b}`;
});
// <end_sequential>

// <start_parallel_all>
import { all as allOp, run as parallelRun } from "@restatedev/restate-sdk-gen";

const parallelExample = gen(function* () {
  const aFuture = parallelRun(() => fetch("/a").then((r) => r.text()), { name: "a" });
  const bFuture = parallelRun(() => fetch("/b").then((r) => r.text()), { name: "b" });
  const [a, b] = yield* allOp([aFuture, bFuture]);
  return `${a}-${b}`;
});
// <end_parallel_all>

// <start_race>
import { race as raceOp, run as raceRun } from "@restatedev/restate-sdk-gen";

const raceExample = gen(function* () {
  const winner = yield* raceOp([
    raceRun(() => fetch("/primary").then((r) => r.text()), { name: "primary" }),
    raceRun(() => fetch("/secondary").then((r) => r.text()), { name: "secondary" }),
  ]);
  return winner;
});
// <end_race>

// <start_spawn>
import { spawn, gen as genOp, all as spawnAll } from "@restatedev/restate-sdk-gen";

// Inside gen(function*() { ... }):
const spawnExample = gen(function* () {
  const workflowA = genOp(function* () {
    return yield* run(() => processA(), { name: "step-a" });
  });
  const workflowB = genOp(function* () {
    return yield* run(() => processB(), { name: "step-b" });
  });

  const t1 = spawn(workflowA);
  const t2 = spawn(workflowB);
  // Both run concurrently
  const [a, b] = yield* spawnAll([t1, t2]);
  return { a, b };
});
// <end_spawn>

// <start_timeout>
import {
  select,
  sleep as sleepOp,
  run as timeoutRun,
} from "@restatedev/restate-sdk-gen";

const timeoutExample = gen(function* () {
  const r = yield* select({
    done: timeoutRun(() => fetch("/slow").then((r) => r.text()), { name: "call" }),
    timeout: sleepOp({ seconds: 5 }),
  });
  if (r.tag === "timeout") throw new Error("timed out");
  return yield* r.future;
});
// <end_timeout>

// <start_retry>
import { run as retryRun } from "@restatedev/restate-sdk-gen";
import { TerminalError } from "@restatedev/restate-sdk";

// Inside gen(function*() { ... }):
const retryExample = gen(function* () {
  let data: unknown;
  try {
    data = yield* retryRun(() => fetchUser("user-id"), {
      name: "fetch-user",
      retry: {
        maxAttempts: 3,
        initialInterval: { milliseconds: 100 },
      },
    });
  } catch (e) {
    if (e instanceof TerminalError) {
      // All retries exhausted; use a fallback
      data = { id: "user-id", name: "Unknown" };
    } else {
      throw e;
    }
  }
  return data;
});
// <end_retry>

// <start_saga>
import { run as sagaRun } from "@restatedev/restate-sdk-gen";

const sagaExample = gen(function* () {
  const reservation = yield* sagaRun(
    () => reserveItem("item-123"),
    { name: "reserve" }
  );
  try {
    const charge = yield* sagaRun(
      () => chargeCard(100),
      { name: "charge" }
    );
    const orderId = yield* sagaRun(
      () => createOrder(reservation.id, charge.id),
      { name: "create-order" }
    );
    return { orderId };
  } catch (e) {
    // Compensate: release the reservation, then propagate
    yield* sagaRun(
      () => releaseItem(reservation.id),
      { name: "release" }
    );
    throw e;
  }
});
// <end_saga>

// <start_channel>
import {
  channel,
  spawn as spawnCh,
  select as selectCh,
  run as channelRun,
  all as channelAll,
  type Channel,
  type Operation,
} from "@restatedev/restate-sdk-gen";

function workerOp(stop: Channel<void>): Operation<string> {
  return gen(function* () {
    const collected: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = yield* selectCh({
        done: channelRun(() => doStep(i), { name: `step-${i}` }),
        stop: stop.receive,
      });
      if (r.tag === "stop") {
        return `stopped-after:${collected.join(",")}`;
      }
      collected.push(yield* r.future);
    }
    return `complete:${collected.join(",")}`;
  });
}

const channelExample = gen(function* () {
  const stop = channel<void>();
  const task = spawnCh(workerOp(stop));
  // ... later, decide to stop the worker:
  yield* stop.send();
  return yield* task;
});
// <end_channel>

// <start_cancellation>
import { CancelledError } from "@restatedev/restate-sdk";
import { run as cancelRun } from "@restatedev/restate-sdk-gen";

// Inside gen(function*() { ... }):
const cancellationExample = gen(function* () {
  try {
    return yield* cancelRun(() => longRunningWork(), { name: "work" });
  } catch (e) {
    if (e instanceof CancelledError) {
      // The invocation is being torn down. Cleanup yields still work.
      yield* cancelRun(() => recordCancellation(), { name: "audit-cancel" });
      throw e; // always re-throw CancelledError
    }
    throw e;
  }
});
// <end_cancellation>

// Placeholder types used in examples above (not exported)
async function processA(): Promise<string> { return "a"; }
async function processB(): Promise<string> { return "b"; }
async function fetchUser(_id: string): Promise<unknown> { return {}; }
async function reserveItem(_id: string): Promise<{ id: string }> { return { id: "r1" }; }
async function chargeCard(_amount: number): Promise<{ id: string }> { return { id: "c1" }; }
async function createOrder(_rId: string, _cId: string): Promise<string> { return "o1"; }
async function releaseItem(_id: string): Promise<void> {}
async function doStep(_i: number): Promise<string> { return `step-${_i}`; }
async function longRunningWork(): Promise<string> { return "done"; }
async function recordCancellation(): Promise<void> {}
