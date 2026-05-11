// Copyright (c) 2023 - Restate Software, Inc., Restate GmbH
//
// This file is part of the Restate examples,
// which are released under the MIT license.
//
// You can find a copy of the license in file LICENSE in the root
// directory of this repository or package, or at
// https://github.com/restatedev/examples/blob/main/LICENSE

// ─────────────────────────────────────────────────────────────────────────────
// Quick start: execute gen() inside a regular async handler
// ─────────────────────────────────────────────────────────────────────────────

// <start_quickstart>
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run, all } from "@restatedev/restate-sdk-gen";

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
// <end_quickstart>

declare function fetchA(signal?: AbortSignal): Promise<string>;
declare function fetchB(signal?: AbortSignal): Promise<string>;
declare function fetchPrimary(): Promise<string>;
declare function fetchSecondary(): Promise<string>;
declare function fetchFast(): Promise<string>;
declare function fetchSlow(): Promise<string>;
declare function doStep(i: number): Promise<string>;
declare function slowCall(): Promise<string>;
declare function fetchUser(id: string): Promise<{ name: string }>;
declare function reserveItem(itemId: string): Promise<{ id: string }>;
declare function chargeCard(amount: number): Promise<{ id: string }>;
declare function createOrder(
  reservationId: string,
  chargeId: string
): Promise<string>;
declare function releaseItem(reservationId: string): Promise<void>;
declare function getStatus(
  jobId: string
): Promise<{ state: "done" | "running" | "failed" }>;
declare const url: string;
declare const id: string;

// ─────────────────────────────────────────────────────────────────────────────
// Sequential work
// ─────────────────────────────────────────────────────────────────────────────

import type { Operation } from "@restatedev/restate-sdk-gen";
import {
  sleep,
  race,
  any,
  allSettled,
  select,
  spawn,
  channel,
  type Channel,
} from "@restatedev/restate-sdk-gen";

// <start_sequential>
// Inside a gen(function*() { ... }) body:
function* sequential(): Operation<string> {
  const a = yield* run(() => fetch("/a").then((r) => r.text()), {
    name: "step-a",
  });
  const b = yield* run(() => fetch("/b").then((r) => r.text()), {
    name: "step-b",
  });
  return `${a}-${b}`;
}
// <end_sequential>

// ─────────────────────────────────────────────────────────────────────────────
// AbortSignal wired into fetch
// ─────────────────────────────────────────────────────────────────────────────

// <start_abort_signal>
// Inside a gen(function*() { ... }) body:
function* withAbortSignal(): Operation<unknown> {
  const data = yield* run(
    async ({ signal }) => {
      const r = await fetch(url, { signal });
      return r.json();
    },
    { name: "fetch" }
  );
  return data;
}
// <end_abort_signal>

// ─────────────────────────────────────────────────────────────────────────────
// Parallel: all
// ─────────────────────────────────────────────────────────────────────────────

// <start_parallel_all>
// Inside a gen(function*() { ... }) body:
function* parallelAll(): Operation<string> {
  const aF = run(() => fetchA(), { name: "a" });
  const bF = run(() => fetchB(), { name: "b" });
  const [a, b] = yield* all([aF, bF]);
  return `${a}-${b}`;
}
// <end_parallel_all>

// ─────────────────────────────────────────────────────────────────────────────
// Race (first to settle)
// ─────────────────────────────────────────────────────────────────────────────

// <start_race>
// Inside a gen(function*() { ... }) body:
function* raceExample(): Operation<string> {
  const winner = yield* race([
    run(() => fetchPrimary(), { name: "primary" }),
    run(() => fetchSecondary(), { name: "secondary" }),
  ]);
  return winner;
}
// <end_race>

// ─────────────────────────────────────────────────────────────────────────────
// Select (race + tag)
// ─────────────────────────────────────────────────────────────────────────────

// <start_select>
// Inside a gen(function*() { ... }) body:
function* selectExample(): Operation<string> {
  const r = yield* select({
    fast: run(() => fetchFast(), { name: "fast" }),
    slow: run(() => fetchSlow(), { name: "slow" }),
  });
  switch (r.tag) {
    case "fast":
      return `fast: ${yield* r.future}`;
    case "slow":
      return `slow: ${yield* r.future}`;
  }
}
// <end_select>

// ─────────────────────────────────────────────────────────────────────────────
// Spawn: concurrent sub-workflows
// ─────────────────────────────────────────────────────────────────────────────

// <start_spawn>
const subWorkflow = (label: string): Operation<string> =>
  gen(function* () {
    return yield* run(async () => `result-${label}`, {
      name: `step-${label}`,
    });
  });

// Inside a gen(function*() { ... }) body:
function* spawnExample(): Operation<string> {
  const t1 = spawn(subWorkflow("A"));
  const t2 = spawn(subWorkflow("B"));
  const a = yield* t1;
  const b = yield* t2;
  return `${a}, ${b}`;
}
// <end_spawn>

// ─────────────────────────────────────────────────────────────────────────────
// Timeout with select + sleep
// ─────────────────────────────────────────────────────────────────────────────

// <start_timeout>
// Inside a gen(function*() { ... }) body:
function* timeoutExample(): Operation<string> {
  const result = yield* select({
    done: run(() => slowCall(), { name: "call" }),
    timeout: sleep({ seconds: 5 }),
  });
  if (result.tag === "timeout") {
    throw new restate.TerminalError("timed out");
  }
  return yield* result.future;
}
// <end_timeout>

// ─────────────────────────────────────────────────────────────────────────────
// Retry policy on run
// ─────────────────────────────────────────────────────────────────────────────

// <start_retry>
// Inside a gen(function*() { ... }) body:
function* retryExample(): Operation<{ name: string }> {
  const userData = yield* run(() => fetchUser(id), {
    name: "fetch-user",
    retry: {
      maxAttempts: 3,
      initialInterval: { milliseconds: 100 },
    },
  });
  return userData;
}
// <end_retry>

// ─────────────────────────────────────────────────────────────────────────────
// Saga-style compensation
// ─────────────────────────────────────────────────────────────────────────────

// <start_saga>
function* placeOrder(req: {
  itemId: string;
  amount: number;
}): Operation<{ orderId: string }> {
  const reservation = yield* run(() => reserveItem(req.itemId), {
    name: "reserve",
  });
  try {
    const charge = yield* run(() => chargeCard(req.amount), { name: "charge" });
    const orderId = yield* run(
      () => createOrder(reservation.id, charge.id),
      { name: "create-order" }
    );
    return { orderId };
  } catch (e) {
    // Compensation step is also journaled — survives crashes.
    yield* run(() => releaseItem(reservation.id), { name: "release" });
    throw e;
  }
}
// <end_saga>

// ─────────────────────────────────────────────────────────────────────────────
// Cooperative cancellation with channels
// ─────────────────────────────────────────────────────────────────────────────

// <start_channel_cancel>
function workerOp(stop: Channel<void>): Operation<string[]> {
  return gen(function* () {
    const collected: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = yield* select({
        done: run(() => doStep(i), { name: `step-${i}` }),
        stop: stop.receive,
      });
      if (r.tag === "stop") return collected;
      collected.push(yield* r.future);
    }
    return collected;
  });
}

// Inside a gen(function*() { ... }) body:
function* cancelExample(): Operation<string[]> {
  const stop = channel<void>();
  const task = spawn(workerOp(stop));
  // ... at some point, signal the worker to stop ...
  yield* stop.send();
  const results = yield* task;
  return results;
}
// <end_channel_cancel>

// ─────────────────────────────────────────────────────────────────────────────
// Polling until ready
// ─────────────────────────────────────────────────────────────────────────────

// <start_polling>
function* pollUntilReady(
  jobId: string
): Operation<{ state: "done" | "running" | "failed" }> {
  let attempt = 0;
  while (true) {
    const status = yield* run(() => getStatus(jobId), {
      name: `poll-${attempt++}`,
    });
    if (status.state === "done") return status;
    yield* sleep({ seconds: 5 });
  }
}
// <end_polling>
