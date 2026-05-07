// Copyright (c) 2023-2026 - Restate Software, Inc., Restate GmbH
//
// This file is part of the Restate SDK for Node.js/TypeScript,
// which is released under the MIT license.
//
// You can find a copy of the license in file LICENSE in the root
// directory of this repository or package, or at
// https://github.com/restatedev/sdk-typescript/blob/main/LICENSE

import * as restate from "@restatedev/restate-sdk";
import {
  gen,
  execute,
  run,
  sleep,
  awakeable,
  all,
  race,
  any,
  allSettled,
  select,
  spawn,
  channel,
  Operation,
} from "@restatedev/restate-sdk-gen";
import { CancelledError, TerminalError } from "@restatedev/restate-sdk";

// <start_hello_world>
const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const greeting = yield* run(async () => `Hello, ${name}!`, {
            name: "compose",
          });
          return greeting;
        })
      ),
  },
});

restate.endpoint().bind(greeter).listen();
// </end_hello_world>

// <start_sequential>
function* sequential(): Operation<string> {
  const a = yield* run(() => fetchA(), { name: "step-a" });
  const b = yield* run(() => fetchB(), { name: "step-b" });
  return `${a}-${b}`;
}
// </end_sequential>

// <start_parallel>
function* parallel(): Operation<string> {
  const aF = run(() => fetchA(), { name: "a" });
  const bF = run(() => fetchB(), { name: "b" });
  const [a, b] = yield* all([aF, bF]);
  return `${a}+${b}`;
}
// </end_parallel>

// <start_race>
function* raceExample(): Operation<string> {
  const winner = yield* race([
    run(() => fetchPrimary(), { name: "primary" }),
    run(() => fetchSecondary(), { name: "secondary" }),
  ]);
  return winner;
}
// </end_race>

// <start_select>
function* selectExample(): Operation<string> {
  const r = yield* select({
    fast: run(() => fetchFast(), { name: "fast" }),
    slow: run(() => fetchSlow(), { name: "slow" }),
  });
  switch (r.tag) {
    case "fast":
      return `fast-won: ${yield* r.future}`;
    case "slow":
      return `slow-won: ${yield* r.future}`;
  }
}
// </end_select>

// <start_spawn>
function* spawnExample(): Operation<[string, string]> {
  const t1 = yield* spawn(gen(workflowA));
  const t2 = yield* spawn(gen(workflowB));
  // Both are running in parallel now.
  const a = yield* t1;
  const b = yield* t2;
  return [a, b];
}
// </end_spawn>

// <start_timeout>
const fastEnough = (): Operation<string> =>
  gen(function* () {
    const r = yield* select({
      done: run(() => slowCall(), { name: "call" }),
      timeout: sleep({ seconds: 5 }),
    });
    if (r.tag === "timeout") throw new TerminalError("timed out");
    return yield* r.future;
  });
// </end_timeout>

// <start_retry>
function* withRetry(): Operation<User> {
  const data = yield* run(() => fetchUser(id), {
    name: "fetch-user",
    retry: {
      maxAttempts: 3,
      initialInterval: { milliseconds: 100 },
    },
  });
  return data;
}
// </end_retry>

// <start_saga>
const reserveAndCharge = (
  itemId: string,
  amount: number
): Operation<{ orderId: string }> =>
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
      // Compensate: release the reservation, then propagate.
      yield* run(() => releaseItem(reservation.id), { name: "release" });
      throw e;
    }
  });
// </end_saga>

// <start_cooperative_cancel>
function workerOp(stop: ReturnType<typeof channel<void>>): Operation<string> {
  return gen(function* () {
    const collected: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = yield* select({
        done: run(() => doStep(i), { name: `step-${i}` }),
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

// Caller:
function* callerExample(): Operation<string> {
  const stop = channel<void>();
  const t = yield* spawn(workerOp(stop));
  // ... decide to stop ...
  yield* stop.send();
  return yield* t;
}
// </end_cooperative_cancel>

// <start_cancellation>
function* handleCancellation(): Operation<string> {
  try {
    return yield* longCall();
  } catch (e) {
    if (e instanceof CancelledError) {
      // The whole workflow is being torn down.
      yield* run(() => recordCancel(), { name: "audit-cancel" });
      throw e; // propagate
    }
    throw e;
  }
}
// </end_cancellation>

// Fake function declarations to make the file compile-checkable as patterns
declare function fetchA(): Promise<string>;
declare function fetchB(): Promise<string>;
declare function fetchPrimary(): Promise<string>;
declare function fetchSecondary(): Promise<string>;
declare function fetchFast(): Promise<string>;
declare function fetchSlow(): Promise<string>;
declare function slowCall(): Promise<string>;
declare function fetchUser(id: string): Promise<User>;
declare function reserveItem(id: string): Promise<{ id: string }>;
declare function chargeCard(amount: number): Promise<{ id: string }>;
declare function createOrder(rId: string, cId: string): Promise<string>;
declare function releaseItem(id: string): Promise<void>;
declare function doStep(i: number): Promise<string>;
declare function longCall(): Operation<string>;
declare function recordCancel(): Promise<void>;
declare function workflowA(): Generator<any, string, any>;
declare function workflowB(): Generator<any, string, any>;
declare const id: string;
declare const awakeableId: string;
interface User { id: string; }
