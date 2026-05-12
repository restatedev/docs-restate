// Snippets for @restatedev/restate-sdk-gen documentation

import * as restate from "@restatedev/restate-sdk";
import {
  gen,
  execute,
  run,
  all,
  select,
  sleep,
  spawn,
  channel,
} from "@restatedev/restate-sdk-gen";

declare function fetchA(): Promise<string>;
declare function fetchB(): Promise<string>;
declare function processItem(item: unknown): Promise<string>;
declare function slowCall(): Promise<string>;
declare function reserveItem(id: string): Promise<{ id: string }>;
declare function chargeCard(amount: number): Promise<{ id: string }>;
declare function releaseItem(id: string): Promise<void>;
declare function doStep(i: number): Promise<string>;
declare const items: unknown[];
declare const itemId: string;
declare const amount: number;

// <start_basic>
const myService = restate.service({
  name: "MyService",
  handlers: {
    process: async (ctx: restate.Context, name: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          // Start two tasks concurrently
          const taskA = run(() => fetchA(), { name: "fetch-a" });
          const taskB = run(() => fetchB(), { name: "fetch-b" });

          // Wait for both
          const [a, b] = yield* all([taskA, taskB]);
          return `${a}+${b} for ${name}`;
        })
      ),
  },
});
// <end_basic>

// <start_fan_out>
const fanOut = gen(function* () {
  const futures = items.map((item, i) =>
    run(() => processItem(item), { name: `process-${i}` })
  );
  return yield* all(futures);
});
// <end_fan_out>

// <start_timeout>
const withTimeout = gen(function* () {
  const r = yield* select({
    done: run(() => slowCall(), { name: "call" }),
    timeout: sleep({ seconds: 5 }),
  });
  if (r.tag === "timeout") throw new Error("timed out");
  return yield* r.future;
});
// <end_timeout>

// <start_saga>
const sagaExample = gen(function* () {
  const reservation = yield* run(() => reserveItem(itemId), {
    name: "reserve",
  });
  try {
    const charge = yield* run(() => chargeCard(amount), { name: "charge" });
    return { orderId: charge.id };
  } catch (e) {
    // Compensate on failure — this step is also journaled
    yield* run(() => releaseItem(reservation.id), { name: "release" });
    throw e;
  }
});
// <end_saga>

// <start_channel>
const withChannel = gen(function* () {
  const stop = channel<void>();
  const worker = spawn(
    gen(function* () {
      for (let i = 0; i < 10; i++) {
        const r = yield* select({
          done: run(() => doStep(i), { name: `step-${i}` }),
          stop: stop.receive,
        });
        if (r.tag === "stop") return "stopped";
      }
      return "complete";
    })
  );

  // ... later, signal the worker to stop ...
  yield* stop.send();
  return yield* worker;
});
// <end_channel>
