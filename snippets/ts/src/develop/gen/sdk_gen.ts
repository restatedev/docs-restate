/*
 * Code snippets for the @restatedev/restate-sdk-gen documentation.
 */

// <start_install>
// npm install @restatedev/restate-sdk @restatedev/restate-sdk-gen
// <end_install>

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
          // Journal entry: runs once on first execution, replays on retry.
          const greeting = yield* run(async () => `Hello, ${name}!`, {
            name: "compose",
          });
          return greeting;
        })
      ),
  },
});

restate.endpoint().bind(greeter).listen();
// <end_hello_world>

// ─── Imports used in examples below ──────────────────────────────────────
import {
  service,
  object,
  workflow,
  spawn,
  all,
  race,
  select,
  sleep,
  awakeable,
  workflowPromise,
  state,
  sharedState,
  channel,
  client,
  sendClient,
  type Operation,
  type Channel,
} from "@restatedev/restate-sdk-gen";

// ─── Sequential and concurrent work ──────────────────────────────────────

// <start_sequential>
const sequentialSvc = service({
  name: "sequential",
  handlers: {
    *run(): Operation<string> {
      const a = yield* run(() => fetch("/a").then((r) => r.text()), {
        name: "step-a",
      });
      const b = yield* run(() => fetch("/b").then((r) => r.text()), {
        name: "step-b",
      });
      return `${a}-${b}`;
    },
  },
});
// <end_sequential>

// <start_parallel>
const parallelSvc = service({
  name: "parallel",
  handlers: {
    *run(): Operation<string> {
      // run() returns a Future immediately — both calls start in parallel.
      const aF = run(() => fetch("/a").then((r) => r.text()), { name: "a" });
      const bF = run(() => fetch("/b").then((r) => r.text()), { name: "b" });
      // yield* all() waits for all futures and returns values in input order.
      const [a, b] = yield* all([aF, bF]);
      return `${a}+${b}`;
    },
  },
});
// <end_parallel>

// <start_race>
const raceSvc = service({
  name: "race",
  handlers: {
    *run(): Operation<string> {
      // First to settle wins; the loser keeps running in the background.
      const winner = yield* race([
        run(() => fetch("/primary").then((r) => r.text()), {
          name: "primary",
        }),
        run(() => fetch("/secondary").then((r) => r.text()), {
          name: "secondary",
        }),
      ]);
      return winner;
    },
  },
});
// <end_race>

// <start_select>
const selectSvc = service({
  name: "select",
  handlers: {
    *run(): Operation<string> {
      // select = race + a tag so you can branch on which branch won.
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
    },
  },
});
// <end_select>

// ─── Spawning concurrent routines ────────────────────────────────────────

// <start_spawn>
const spawnSvc = service({
  name: "spawn",
  handlers: {
    *run(): Operation<string> {
      // spawn() runs an Operation as an independent concurrent routine.
      const tA = spawn(
        (function* () {
          return yield* run(() => fetch("/a").then((r) => r.text()), {
            name: "a",
          });
        })()
      );
      const tB = spawn(
        (function* () {
          return yield* run(() => fetch("/b").then((r) => r.text()), {
            name: "b",
          });
        })()
      );
      // Combinators work the same over spawned and journal-backed futures.
      const [a, b] = yield* all([tA, tB]);
      return `${a}|${b}`;
    },
  },
});
// <end_spawn>

// ─── Timeout pattern ──────────────────────────────────────────────────────

// <start_timeout>
const timeoutSvc = service({
  name: "timeout",
  handlers: {
    *withTimeout(req: {
      workMs: number;
      budgetSeconds: number;
    }): Operation<string> {
      const r = yield* select({
        done: run(
          async () => {
            // Simulated work — replace with a real call.
            await new Promise((resolve) => setTimeout(resolve, req.workMs));
            return "done";
          },
          { name: "work" }
        ),
        timeout: sleep({ seconds: req.budgetSeconds }),
      });
      if (r.tag === "timeout") {
        throw new restate.TerminalError(
          `timed out after ${req.budgetSeconds}s`
        );
      }
      return yield* r.future;
    },
  },
});
// <end_timeout>

// ─── Saga / compensation ──────────────────────────────────────────────────

// <start_saga>
type OrderRequest = { itemId: string; amount: number; cardToken: string };
type OrderResult = { orderId: string };

const sagaSvc = service({
  name: "saga",
  handlers: {
    *placeOrder(req: OrderRequest): Operation<OrderResult> {
      // Each step is a journal entry. If the process crashes mid-saga,
      // Restate replays from the last completed step.
      const reservation = yield* run(
        () => reserveItem(req.itemId),
        { name: "reserve" }
      );
      try {
        const charge = yield* run(
          () => chargeCard(req.amount, req.cardToken),
          { name: "charge" }
        );
        const orderId = yield* run(
          () => createOrder(reservation.id, charge.id),
          { name: "create-order" }
        );
        return { orderId };
      } catch (e) {
        // Compensate the reservation; this is also journaled.
        yield* run(() => releaseItem(reservation.id), { name: "release" });
        throw e;
      }
    },
  },
});

// Placeholder stubs (replace with real implementations):
declare function reserveItem(id: string): Promise<{ id: string }>;
declare function chargeCard(
  amount: number,
  token: string
): Promise<{ id: string }>;
declare function createOrder(resId: string, chargeId: string): Promise<string>;
declare function releaseItem(id: string): Promise<void>;
// <end_saga>

// ─── State management ──────────────────────────────────────────────────────

// <start_state>
type CounterState = { counter: number };

const counterObj = object({
  name: "counter",
  handlers: {
    // Shared (read-only) handler: multiple can run concurrently.
    *get() {
      return (yield* sharedState<CounterState>().get("counter")) ?? 0;
    },

    // Exclusive (read-write) handler: only one runs at a time per key.
    *add(addend: number) {
      const s = state<CounterState>();
      const oldValue = (yield* s.get("counter")) ?? 0;
      const newValue = oldValue + addend;
      s.set("counter", newValue);
      return { oldValue, newValue };
    },

    *reset() {
      state<CounterState>().clear("counter");
    },
  },
  options: {
    handlers: {
      get: { shared: true },
    },
  },
});
// <end_state>

// ─── Awakeables ──────────────────────────────────────────────────────────

// <start_awakeable>
const awakeableSvc = service({
  name: "awakeableSvc",
  handlers: {
    *waitForApproval(requestId: string): Operation<string> {
      // Create a durable promise that external systems can resolve.
      const { id, promise } = awakeable<string>();
      // Share the id with an external system so it can resolve the promise.
      yield* run(
        async () => {
          await notifyExternalSystem(requestId, id);
        },
        { name: "notify" }
      );
      // Park until the external system calls the resolve endpoint.
      const result = yield* promise;
      return result;
    },
  },
});

declare function notifyExternalSystem(
  requestId: string,
  awakeableId: string
): Promise<void>;
// <end_awakeable>

// ─── Workflow with durable promises ──────────────────────────────────────

// <start_workflow>
type WfState = { input: string };

const approvalWorkflow = workflow({
  name: "approval",
  handlers: {
    // run() executes once per workflow ID.
    *run(input: string): Operation<string> {
      state<WfState>().set("input", input);

      // Park until the `approve` handler resolves this promise.
      const value = yield* workflowPromise<string>("decision").get();
      return `Processed: ${value}`;
    },

    // Shared handlers can interact with the running workflow.
    *approve(decision: string) {
      yield* workflowPromise<string>("decision").resolve(decision);
    },

    *getInput() {
      return (yield* sharedState<WfState>().get("input")) ?? null;
    },
  },
});
// <end_workflow>

// ─── Service clients ──────────────────────────────────────────────────────

// <start_clients>
const callerSvc = service({
  name: "caller",
  handlers: {
    // Typed request-response call — yield* for the result.
    *callOther(name: string): Operation<string> {
      return yield* client(greeterForClient).greet(name);
    },

    // Fire-and-forget — don't yield the result.
    *fireAndForget(msg: string) {
      sendClient(greeterForClient).greet(msg);
    },
  },
});

// Define a compatible service to call (or import from its module).
const greeterForClient = service({
  name: "greeter",
  handlers: {
    *greet(name: string): Operation<string> {
      return yield* run(async () => `Hello, ${name}!`, { name: "greet" });
    },
  },
});
// <end_clients>

// ─── Cancellation ──────────────────────────────────────────────────────────

// <start_cooperative_cancel>
function pollWorker(jobId: string, stop: Channel<void>): Operation<string | null> {
  return (function* () {
    let attempt = 0;
    while (true) {
      const r = yield* select({
        status: run(() => checkJobStatus(jobId), {
          name: `poll-${attempt}`,
        }),
        stop: stop.receive,
      });
      if (r.tag === "stop") return null;
      const status: string = yield* r.future;
      if (status === "done") return status;
      attempt++;
      // Stay interruptible while sleeping between polls.
      const tick = yield* select({
        tick: sleep({ seconds: 1 }),
        stop: stop.receive,
      });
      if (tick.tag === "stop") return null;
    }
  })();
}

const pollSvc = service({
  name: "poll",
  handlers: {
    *pollWithBudget(req: { jobId: string; budgetSeconds: number }) {
      const stop = channel<void>();
      const worker = spawn(pollWorker(req.jobId, stop));
      const r = yield* select({
        done: worker,
        budget: sleep({ seconds: req.budgetSeconds }),
      });
      if (r.tag === "budget") {
        // Signal the worker to stop, then wait for it to wind down.
        yield* stop.send();
      }
      return yield* worker;
    },
  },
});

declare function checkJobStatus(jobId: string): Promise<string>;
// <end_cooperative_cancel>
