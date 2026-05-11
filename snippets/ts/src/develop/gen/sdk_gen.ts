/*
 * Code snippets for the @restatedev/restate-sdk-gen documentation.
 * All examples use the free-standing API (no ctx threading).
 */

// <start_hello_world>
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run } from "@restatedev/restate-sdk-gen";

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
import { run as runStep, gen as genSeq } from "@restatedev/restate-sdk-gen";

const sequentialExample = genSeq(function* () {
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
import { all, run as parallelRun, gen as genParallel } from "@restatedev/restate-sdk-gen";

const parallelExample = genParallel(function* () {
  const aFuture = parallelRun(() => fetch("/a").then((r) => r.text()), { name: "a" });
  const bFuture = parallelRun(() => fetch("/b").then((r) => r.text()), { name: "b" });
  const [a, b] = yield* all([aFuture, bFuture]);
  return `${a}-${b}`;
});
// <end_parallel_all>

// <start_race>
import { race, run as raceRun, gen as genRace } from "@restatedev/restate-sdk-gen";

const raceExample = genRace(function* () {
  const winner = yield* race([
    raceRun(() => fetch("/primary").then((r) => r.text()), { name: "primary" }),
    raceRun(() => fetch("/secondary").then((r) => r.text()), { name: "secondary" }),
  ]);
  return winner;
});
// <end_race>

// <start_spawn>
import { spawn, gen as genSpawn, all as spawnAll, run as spawnRun } from "@restatedev/restate-sdk-gen";

const spawnExample = genSpawn(function* () {
  const workflowA = genSpawn(function* () {
    return yield* spawnRun(() => processA(), { name: "step-a" });
  });
  const workflowB = genSpawn(function* () {
    return yield* spawnRun(() => processB(), { name: "step-b" });
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
  sleep,
  run as timeoutRun,
  gen as genTimeout,
} from "@restatedev/restate-sdk-gen";

const timeoutExample = genTimeout(function* () {
  const r = yield* select({
    done: timeoutRun(() => fetch("/slow").then((r) => r.text()), { name: "call" }),
    timeout: sleep({ seconds: 5 }),
  });
  if (r.tag === "timeout") throw new Error("timed out");
  return yield* r.future;
});
// <end_timeout>

// <start_retry>
import { run as retryRun, gen as genRetry } from "@restatedev/restate-sdk-gen";
import { TerminalError } from "@restatedev/restate-sdk";

const retryExample = genRetry(function* () {
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
import { run as sagaRun, gen as genSaga } from "@restatedev/restate-sdk-gen";

const sagaExample = genSaga(function* () {
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
  gen as genChannel,
  type Channel,
  type Operation,
} from "@restatedev/restate-sdk-gen";

function workerOp(stop: Channel<void>): Operation<string> {
  return genChannel(function* () {
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

const channelExample = genChannel(function* () {
  const stop = channel<void>();
  const task = spawnCh(workerOp(stop));
  // ... later, decide to stop the worker:
  yield* stop.send();
  return yield* task;
});
// <end_channel>

// <start_cancellation>
import { CancelledError } from "@restatedev/restate-sdk";
import { run as cancelRun, gen as genCancel } from "@restatedev/restate-sdk-gen";

const cancellationExample = genCancel(function* () {
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

// Placeholder types used in examples above
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
