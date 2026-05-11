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
  spawn,
  awakeable,
  channel,
  state,
  type Operation,
  type Channel,
  service,
} from "@restatedev/restate-sdk-gen";

// ────────────────────────────────────────────────────────────────────
// Quick start: service defined using the gen API directly
// ────────────────────────────────────────────────────────────────────

// <start_quickstart>
import {
  gen,
  execute,
  run,
  all,
  service,
} from "@restatedev/restate-sdk-gen";

const greeter = service({
  name: "greeter",
  handlers: {
    // Handlers can also be written as generator functions directly
    *greet(name: string): Operation<string> {
      const greeting = yield* run(async () => `Hello, ${name}!`, {
        name: "compose",
      });
      return greeting;
    },
  },
});

restate.endpoint().bind(greeter).listen();
// <end_quickstart>

// ────────────────────────────────────────────────────────────────────
// execute() with gen() inside a regular async handler
// ────────────────────────────────────────────────────────────────────

// <start_execute_gen>
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run, all } from "@restatedev/restate-sdk-gen";

const greetSvc = restate.service({
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
// <end_execute_gen>

// ────────────────────────────────────────────────────────────────────
// Sequential work
// ────────────────────────────────────────────────────────────────────

// <start_sequential>
*sequential(): Operation<string> {
  const a = yield* run(() => fetch("/a").then((r) => r.text()), {
    name: "step-a",
  });
  const b = yield* run(() => fetch("/b").then((r) => r.text()), {
    name: "step-b",
  });
  return `${a}-${b}`;
}
// <end_sequential>

// ────────────────────────────────────────────────────────────────────
// AbortSignal wired into fetch
// ────────────────────────────────────────────────────────────────────

// <start_abort_signal>
const data = yield* run(
  async ({ signal }) => {
    const r = await fetch(url, { signal });
    return r.json();
  },
  { name: "fetch" }
);
// <end_abort_signal>

// ────────────────────────────────────────────────────────────────────
// Parallel: all
// ────────────────────────────────────────────────────────────────────

// <start_parallel_all>
const aF = run(() => fetchA(), { name: "a" });
const bF = run(() => fetchB(), { name: "b" });
const [a, b] = yield* all([aF, bF]);
return `${a}-${b}`;
// <end_parallel_all>

// ────────────────────────────────────────────────────────────────────
// Race (first to settle)
// ────────────────────────────────────────────────────────────────────

// <start_race>
const winner = yield* race([
  run(() => fetchPrimary(), { name: "primary" }),
  run(() => fetchSecondary(), { name: "secondary" }),
]);
// <end_race>

// ────────────────────────────────────────────────────────────────────
// Select (race + tag)
// ────────────────────────────────────────────────────────────────────

// <start_select>
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
// <end_select>

// ────────────────────────────────────────────────────────────────────
// Spawn: concurrent sub-workflows
// ────────────────────────────────────────────────────────────────────

// <start_spawn>
const subWorkflow = (label: string): Operation<string> =>
  gen(function* () {
    return yield* run(async () => `result-${label}`, { name: `step-${label}` });
  });

// In your handler:
const t1 = spawn(subWorkflow("A"));
const t2 = spawn(subWorkflow("B"));
const a = yield* t1;
const b = yield* t2;
return `${a}, ${b}`;
// <end_spawn>

// ────────────────────────────────────────────────────────────────────
// Timeout with select + sleep
// ────────────────────────────────────────────────────────────────────

// <start_timeout>
const result = yield* select({
  done: run(() => slowCall(), { name: "call" }),
  timeout: sleep({ seconds: 5 }),
});
if (result.tag === "timeout") {
  throw new restate.TerminalError("timed out");
}
return yield* result.future;
// <end_timeout>

// ────────────────────────────────────────────────────────────────────
// Retry policy on run
// ────────────────────────────────────────────────────────────────────

// <start_retry>
const userData = yield* run(() => fetchUser(id), {
  name: "fetch-user",
  retry: {
    maxAttempts: 3,
    initialInterval: { milliseconds: 100 },
  },
});
// <end_retry>

// ────────────────────────────────────────────────────────────────────
// Saga-style compensation
// ────────────────────────────────────────────────────────────────────

// <start_saga>
*placeOrder(req: { itemId: string; amount: number }): Operation<{ orderId: string }> {
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

// ────────────────────────────────────────────────────────────────────
// Cooperative cancellation with channels
// ────────────────────────────────────────────────────────────────────

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

// In the caller:
const stop = channel<void>();
const task = spawn(workerOp(stop));
// ... at some point ...
yield* stop.send();
const results = yield* task;
// <end_channel_cancel>

// ────────────────────────────────────────────────────────────────────
// Polling with stop
// ────────────────────────────────────────────────────────────────────

// <start_polling>
*pollUntilReady(jobId: string): Operation<{ state: string }> {
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
