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

// <start_basic>
const greeter = restate.service({
  name: "greeter",
  handlers: {
    greet: async (ctx: restate.Context, name: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const a = yield* run(() => fetchA(), { name: "fetch-a" });
          const b = yield* run(() => fetchB(), { name: "fetch-b" });
          return `${a}+${b} for ${name}`;
        })
      ),
  },
});
// <end_basic>

// <start_parallel>
const parallelWork = restate.service({
  name: "parallelWork",
  handlers: {
    process: async (ctx: restate.Context, items: string[]): Promise<string[]> =>
      execute(
        ctx,
        gen(function* () {
          // Start all tasks concurrently — no await yet
          const futures = items.map((item, i) =>
            run(() => processItem(item), { name: `process-${i}` })
          );
          // Wait for all to complete
          return yield* all(futures);
        })
      ),
  },
});
// <end_parallel>

// <start_race>
const withTimeout = restate.service({
  name: "withTimeout",
  handlers: {
    fetch: async (ctx: restate.Context, url: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const r = yield* select({
            done: run(({ signal }) => fetch(url, { signal }).then((r) => r.text()), { name: "call" }),
            timeout: sleep({ seconds: 10 }),
          });
          if (r.tag === "timeout") {
            throw new restate.TerminalError("Request timed out");
          }
          return yield* r.future;
        })
      ),
  },
});
// <end_race>

// <start_saga>
const bookTrip = restate.service({
  name: "bookTrip",
  handlers: {
    book: async (
      ctx: restate.Context,
      trip: { destination: string; budget: number }
    ): Promise<{ bookingId: string }> =>
      execute(
        ctx,
        gen(function* () {
          const flight = yield* run(() => reserveFlight(trip.destination), {
            name: "reserve-flight",
          });
          try {
            const hotel = yield* run(() => reserveHotel(trip.destination), {
              name: "reserve-hotel",
            });
            try {
              const bookingId = yield* run(
                () => confirmBooking(flight.id, hotel.id),
                { name: "confirm" }
              );
              return { bookingId };
            } catch (e) {
              yield* run(() => cancelHotel(hotel.id), { name: "cancel-hotel" });
              throw e;
            }
          } catch (e) {
            yield* run(() => cancelFlight(flight.id), {
              name: "cancel-flight",
            });
            throw e;
          }
        })
      ),
  },
});
// <end_saga>

// <start_spawn>
const pipeline = restate.service({
  name: "pipeline",
  handlers: {
    run: async (ctx: restate.Context, data: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          // Spawn two independent sub-workflows in parallel
          const stageA = yield* spawn(
            gen(function* () {
              const r = yield* run(() => stageAWork(data), { name: "stage-a" });
              return r;
            })
          );
          const stageB = yield* spawn(
            gen(function* () {
              const r = yield* run(() => stageBWork(data), { name: "stage-b" });
              return r;
            })
          );
          // Wait for both
          const [a, b] = yield* all([stageA, stageB]);
          return `${a}|${b}`;
        })
      ),
  },
});
// <end_spawn>

// <start_cooperative_cancel>
const worker = restate.service({
  name: "worker",
  handlers: {
    process: async (
      ctx: restate.Context,
      jobId: string
    ): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const stop = channel<void>();
          const task = yield* spawn(
            gen(function* () {
              let step = 0;
              while (true) {
                const r = yield* select({
                  work: run(() => doStep(jobId, step++), {
                    name: `step-${step}`,
                  }),
                  stop: stop.receive,
                });
                if (r.tag === "stop") return "stopped";
                yield* r.future;
              }
            })
          );
          // Let the worker run for a while, then stop it
          yield* sleep({ seconds: 30 });
          yield* stop.send();
          return yield* task;
        })
      ),
  },
});
// <end_cooperative_cancel>

// Stub helpers for type-checking
async function fetchA(): Promise<string> { return "a"; }
async function fetchB(): Promise<string> { return "b"; }
async function processItem(item: string): Promise<string> { return item; }
async function stageAWork(data: string): Promise<string> { return data; }
async function stageBWork(data: string): Promise<string> { return data; }
async function reserveFlight(destination: string): Promise<{ id: string }> { return { id: "f1" }; }
async function reserveHotel(destination: string): Promise<{ id: string }> { return { id: "h1" }; }
async function confirmBooking(flightId: string, hotelId: string): Promise<string> { return "booking-123"; }
async function cancelFlight(id: string): Promise<void> {}
async function cancelHotel(id: string): Promise<void> {}
async function doStep(jobId: string, step: number): Promise<void> {}
