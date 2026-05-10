// @ts-nocheck — illustrative snippets; sdk-gen types are not installed in this package

// <start_installation>
// npm install @restatedev/restate-sdk @restatedev/restate-sdk-gen
// <end_installation>

// <start_quickstart>
import { service, run, all, Operation } from "@restatedev/restate-sdk-gen";
import * as restate from "@restatedev/restate-sdk";

const greeter = service({
  name: "greeter",
  handlers: {
    // Generator handler: use `*` syntax and `yield*` to compose durable steps
    *greet(name: string): Operation<string> {
      const a = run(() => fetchGreeting(name), { name: "fetch-greeting" });
      const b = run(() => fetchEmoji(), { name: "fetch-emoji" });
      const [greeting, emoji] = yield* all([a, b]);
      return `${greeting} ${emoji}`;
    },
  },
});

restate.endpoint().bind(greeter).listen();
// <end_quickstart>

// <start_sequential>
import { run } from "@restatedev/restate-sdk-gen";

// Each `run` is a durable journal entry — on replay the recorded value
// is returned without re-executing the closure.
*sequential(): Operation<string> {
  const a = yield* run(() => fetchA(), { name: "step-a" });
  const b = yield* run(() => fetchB(), { name: "step-b" });
  return `${a}-${b}`;
}
// <end_sequential>

// <start_parallel>
import { run, all } from "@restatedev/restate-sdk-gen";

// `run` returns a Future<T> immediately. `all` waits for every future
// and returns their values in input order.
*parallel(): Operation<string> {
  const aF = run(() => fetchA(), { name: "a" });
  const bF = run(() => fetchB(), { name: "b" });
  const [a, b] = yield* all([aF, bF]);
  return `${a}+${b}`;
}
// <end_parallel>

// <start_race>
import { run, race, select } from "@restatedev/restate-sdk-gen";

// `race`: return the first future to settle; the loser keeps running.
*firstWins(): Operation<string> {
  return yield* race([
    run(() => fetchPrimary(), { name: "primary" }),
    run(() => fetchSecondary(), { name: "secondary" }),
  ]);
}

// `select`: like race but with a tag so you know which branch won.
*taggedRace(): Operation<string> {
  const r = yield* select({
    fast: run(() => fetchFast(), { name: "fast" }),
    slow: run(() => fetchSlow(), { name: "slow" }),
  });
  switch (r.tag) {
    case "fast": return `fast won: ${yield* r.future}`;
    case "slow": return `slow won: ${yield* r.future}`;
  }
}
// <end_race>

// <start_spawn>
import { gen, spawn, all, type Operation } from "@restatedev/restate-sdk-gen";

// `spawn` registers an Operation as a concurrent routine and returns a Future<T>.
// Use it when each unit of work has its own internal logic, branches, or retries.
const subWorkflow = (label: string): Operation<string> =>
  gen(function* () {
    const result = yield* run(() => doWork(label), { name: `work-${label}` });
    return result;
  });

*fanOut(): Operation<string[]> {
  const t1 = spawn(subWorkflow("a"));
  const t2 = spawn(subWorkflow("b"));
  const t3 = spawn(subWorkflow("c"));
  return yield* all([t1, t2, t3]);
}
// <end_spawn>

// <start_timeout>
import { run, sleep, select } from "@restatedev/restate-sdk-gen";

*withTimeout(): Operation<string> {
  const r = yield* select({
    done: run(() => slowCall(), { name: "call" }),
    timeout: sleep({ seconds: 5 }),
  });
  if (r.tag === "timeout") {
    throw new Error("timed out after 5 seconds");
  }
  return yield* r.future;
}
// <end_timeout>

// <start_abort_signal>
import { run } from "@restatedev/restate-sdk-gen";

// The `run` closure receives `{ signal }` — an AbortSignal that aborts when
// the invocation is cancelled. Plumb it into AbortSignal-aware APIs so
// in-flight calls cancel promptly instead of blocking.
*fetchWithCancellation(url: string): Operation<string> {
  return yield* run(
    async ({ signal }) => {
      const response = await fetch(url, { signal });
      return response.text();
    },
    { name: "fetch" }
  );
}
// <end_abort_signal>

// <start_retry>
import { run } from "@restatedev/restate-sdk-gen";

// Bound the number of attempts via the `retry` option.
// When the limit is hit, run throws a TerminalError wrapping the original error.
*fetchWithRetry(id: string): Operation<unknown> {
  return yield* run(() => fetchUser(id), {
    name: "fetch-user",
    retry: {
      maxAttempts: 3,
      initialInterval: { milliseconds: 100 },
    },
  });
}
// <end_retry>

// <start_saga>
import { run, type Operation } from "@restatedev/restate-sdk-gen";

*placeOrder(req: { itemId: string; amount: number }): Operation<{ orderId: string }> {
  const reservation = yield* run(() => reserveItem(req.itemId), { name: "reserve" });
  try {
    const charge = yield* run(() => chargeCard(req.amount), { name: "charge" });
    const orderId = yield* run(
      () => createOrder(reservation.id, charge.id),
      { name: "create-order" }
    );
    return { orderId };
  } catch (e) {
    // Compensation is journaled — survives crashes during cleanup.
    yield* run(() => releaseItem(reservation.id), { name: "release" });
    throw e;
  }
}
// <end_saga>

// <start_cooperative_cancel>
import { channel, spawn, select, type Channel, type Operation } from "@restatedev/restate-sdk-gen";

function worker(stop: Channel<void>): Operation<string> {
  return (function* () {
    for (let i = 0; i < 10; i++) {
      const r = yield* select({
        done: run(() => doStep(i), { name: `step-${i}` }),
        stop: stop.receive,
      });
      if (r.tag === "stop") return `stopped at step ${i}`;
      yield* r.future;
    }
    return "complete";
  })();
}

*runWithStop(): Operation<string> {
  const stop = channel<void>();
  const task = spawn(worker(stop));

  // ... decide to stop early ...
  yield* stop.send();

  return yield* task;
}
// <end_cooperative_cancel>
