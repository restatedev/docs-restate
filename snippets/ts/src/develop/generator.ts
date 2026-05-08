import {
  service,
  run,
  all,
  race,
  any,
  allSettled,
  select,
  spawn,
  sleep,
  channel,
  gen,
  type Operation,
} from "@restatedev/restate-sdk-gen";
import { TerminalError, CancelledError } from "@restatedev/restate-sdk";

// <start_hello_world>
import * as restate from "@restatedev/restate-sdk";
import { execute } from "@restatedev/restate-sdk-gen";

const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string) =>
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
// <end_hello_world>

// <start_generator_shorthand>
const greeter2 = service({
  name: "greeter",
  handlers: {
    // Generator function shorthand — no execute() wrapper needed
    *greet(name: string): Operation<string> {
      const greeting = yield* run(async () => `Hello, ${name}!`, {
        name: "compose",
      });
      return greeting;
    },
  },
});
// <end_generator_shorthand>

// <start_sequential>
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

// <start_parallel_all>
function* parallel(): Operation<string> {
  const aF = run(() => fetch("/a").then((r) => r.text()), { name: "a" });
  const bF = run(() => fetch("/b").then((r) => r.text()), { name: "b" });
  const [a, b] = yield* all([aF, bF]);
  return `${a}+${b}`;
}
// <end_parallel_all>

// <start_race>
function* raceExample(): Operation<string> {
  return yield* race([
    run(() => fetch("/primary").then((r) => r.text()), { name: "primary" }),
    run(() => fetch("/secondary").then((r) => r.text()), { name: "secondary" }),
  ]);
}
// <end_race>

// <start_any>
function* anyExample(): Operation<string> {
  return yield* any([
    run(() => fetch("/region-a").then((r) => r.text()), { name: "region-a" }),
    run(() => fetch("/region-b").then((r) => r.text()), { name: "region-b" }),
    run(() => fetch("/region-c").then((r) => r.text()), { name: "region-c" }),
  ]);
}
// <end_any>

// <start_select>
function* selectExample(): Operation<string> {
  const r = yield* select({
    fast: run(() => fetch("/fast").then((r) => r.text()), { name: "fast" }),
    slow: run(() => fetch("/slow").then((r) => r.text()), { name: "slow" }),
  });
  switch (r.tag) {
    case "fast":
      return `fast: ${yield* r.future}`;
    case "slow":
      return `slow: ${yield* r.future}`;
  }
}
// <end_select>

// <start_spawn>
const subWorkflow = (label: string): Operation<string> =>
  gen(function* () {
    const result = yield* run(async () => label, { name: `${label}-step` });
    return result;
  });

function* spawnExample(): Operation<string> {
  const t1 = spawn(subWorkflow("A"));
  const t2 = spawn(subWorkflow("B"));
  // Both are running in parallel now.
  const a = yield* t1;
  const b = yield* t2;
  return `${a}|${b}`;
}
// <end_spawn>

// <start_timeout>
function* withTimeout(url: string): Operation<string> {
  const r = yield* select({
    done: run(() => fetch(url).then((r) => r.text()), { name: "call" }),
    timeout: sleep({ seconds: 5 }),
  });
  if (r.tag === "timeout") {
    throw new TerminalError("timed out");
  }
  return yield* r.future;
}
// <end_timeout>

// <start_retry_bounded>
async function fetchUser(id: string): Promise<{ name: string }> {
  const r = await fetch(`/users/${id}`);
  return r.json();
}

function* boundedRetry(id: string): Operation<{ name: string }> {
  const data = yield* run(() => fetchUser(id), {
    name: "fetch-user",
    retry: {
      maxAttempts: 3,
      initialInterval: { milliseconds: 100 },
    },
  });
  return data;
}
// <end_retry_bounded>

// <start_cooperative_cancel>
type StopSignal = ReturnType<typeof channel<void>>;

function workerOp(stop: StopSignal): Operation<string> {
  return gen(function* () {
    const collected: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = yield* select({
        done: run(async () => `step-${i}`, { name: `step-${i}` }),
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

function* cancelExample(): Operation<string> {
  const stop = channel<void>();
  const t = spawn(workerOp(stop));
  // Trigger a stop after some condition
  yield* stop.send();
  return yield* t;
}
// <end_cooperative_cancel>

// <start_saga>
const reserveAndCharge = (
  itemId: string,
  amount: number
): Operation<{ orderId: string }> =>
  gen(function* () {
    const reservation = yield* run(() =>
      fetch(`/reserve/${itemId}`).then((r) => r.json()), { name: "reserve" }
    );
    try {
      const charge = yield* run(() =>
        fetch(`/charge/${amount}`).then((r) => r.json()), { name: "charge" }
      );
      const orderId = yield* run(
        () => fetch("/order").then((r) => r.text()),
        { name: "create-order" }
      );
      return { orderId };
    } catch (e) {
      // Compensate: release the reservation, then propagate.
      yield* run(() => fetch(`/release/${reservation.id}`), { name: "release" });
      throw e;
    }
  });
// <end_saga>

// <start_polling>
type JobStatus = { state: string; result?: string };

function pollUntilReady(jobId: string): Operation<JobStatus> {
  return gen(function* () {
    let attempt = 0;
    while (true) {
      const status: JobStatus = yield* run(
        () => fetch(`/jobs/${jobId}`).then((r) => r.json()),
        { name: `poll-${attempt++}` }
      );
      if (status.state === "done") return status;
      if (status.state === "failed") {
        throw new TerminalError(`job ${jobId} failed`);
      }
      yield* sleep({ seconds: 5 });
    }
  });
}
// <end_polling>
