import * as restate from "@restatedev/restate-sdk";
import {
  gen,
  execute,
  run,
  sleep,
  all,
  race,
  select,
  spawn,
  channel,
} from "@restatedev/restate-sdk-gen";
import type { Operation } from "@restatedev/restate-sdk-gen";

// <start_quickstart>
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
// <end_quickstart>

async function fetchA(signal: AbortSignal): Promise<string> {
  return "a";
}
async function fetchB(signal: AbortSignal): Promise<string> {
  return "b";
}

// <start_sequential>
const sequentialService = restate.service({
  name: "sequential",
  handlers: {
    process: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          // Steps run sequentially; each is journaled
          const a = yield* run(() => fetch("/a").then((r) => r.text()), {
            name: "step-a",
          });
          const b = yield* run(() => fetch("/b").then((r) => r.text()), {
            name: "step-b",
          });
          return `${a}-${b}`;
        })
      ),
  },
});
// <end_sequential>

// <start_parallel>
const parallelService = restate.service({
  name: "parallel",
  handlers: {
    process: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          // Start both futures immediately; they run in parallel
          const aF = run(() => fetch("/a").then((r) => r.text()), {
            name: "a",
          });
          const bF = run(() => fetch("/b").then((r) => r.text()), {
            name: "b",
          });
          const [a, b] = yield* all([aF, bF]);
          return `${a}-${b}`;
        })
      ),
  },
});
// <end_parallel>

// <start_race_example>
const raceService = restate.service({
  name: "race",
  handlers: {
    fetch: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          const winner = yield* race([
            run(() => fetch("/primary").then((r) => r.text()), {
              name: "primary",
            }),
            run(() => fetch("/secondary").then((r) => r.text()), {
              name: "secondary",
            }),
          ]);
          return winner;
        })
      ),
  },
});
// <end_race_example>

// <start_select_example>
const selectService = restate.service({
  name: "select",
  handlers: {
    fetch: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          const r = yield* select({
            fast: run(() => fetch("/fast").then((r) => r.text()), {
              name: "fast",
            }),
            slow: run(() => fetch("/slow").then((r) => r.text()), {
              name: "slow",
            }),
          });
          switch (r.tag) {
            case "fast":
              return `fast: ${yield* r.future}`;
            case "slow":
              return `slow: ${yield* r.future}`;
          }
        })
      ),
  },
});
// <end_select_example>

// <start_timeout_example>
const timeoutService = restate.service({
  name: "timeout",
  handlers: {
    fetch: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          const r = yield* select({
            done: run(() => fetch("/slow").then((r) => r.text()), {
              name: "call",
            }),
            timeout: sleep({ seconds: 5 }),
          });
          if (r.tag === "timeout") throw new Error("timed out");
          return yield* r.future;
        })
      ),
  },
});
// <end_timeout_example>

// <start_saga_example>
const sagaService = restate.service({
  name: "saga",
  handlers: {
    reserveAndCharge: async (
      ctx: restate.Context,
      req: { itemId: string; amount: number }
    ) =>
      execute(
        ctx,
        gen(function* () {
          const reservation = yield* run(() => reserveItem(req.itemId), {
            name: "reserve",
          });
          try {
            const charge = yield* run(() => chargeCard(req.amount), {
              name: "charge",
            });
            const orderId = yield* run(
              () => createOrder(reservation.id, charge.id),
              { name: "create-order" }
            );
            return { orderId };
          } catch (e) {
            // Compensate: release the reservation before propagating
            yield* run(() => releaseItem(reservation.id), { name: "release" });
            throw e;
          }
        })
      ),
  },
});
// <end_saga_example>

async function reserveItem(itemId: string): Promise<{ id: string }> {
  return { id: "res-1" };
}
async function chargeCard(amount: number): Promise<{ id: string }> {
  return { id: "charge-1" };
}
async function createOrder(
  reservationId: string,
  chargeId: string
): Promise<{ orderId: string }> {
  return { orderId: "order-1" };
}
async function releaseItem(id: string): Promise<void> {}

// <start_cooperative_cancel>
function workerOp(
  stop: ReturnType<typeof channel<void>>
): Operation<string> {
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

const cancelService = restate.service({
  name: "cancel",
  handlers: {
    run: async (ctx: restate.Context) =>
      execute(
        ctx,
        gen(function* () {
          const stop = channel<void>();
          const t = yield* spawn(workerOp(stop));
          // ... decide to stop ...
          yield* stop.send();
          return yield* t;
        })
      ),
  },
});
// <end_cooperative_cancel>

async function doStep(i: number): Promise<string> {
  return `step-${i}`;
}

restate.endpoint().bind(greeter).listen();
