// <start_iface_define>
import {
  iface,
  implement,
  client,
  sendClient,
  service,
  state,
} from "@restatedev/restate-sdk-gen";

// Define a service interface — no implementation here.
// This can live in a shared package imported by both the server and its callers.
export const counterIface = iface.object("counter", {
  increment: iface.json<number, number>(),
  get: iface.json<void, number>(),
});
// <end_iface_define>

// <start_iface_implement>
type CounterState = { value: number };

// Bind generator functions to the interface
export const counterImpl = implement(counterIface, {
  handlers: {
    *increment(delta) {
      const s = state<CounterState>();
      const value = ((yield* s.get("value")) ?? 0) + delta;
      s.set("value", value);
      return value;
    },
    *get() {
      return (yield* state<CounterState>().get("value")) ?? 0;
    },
  },
  options: {
    handlers: { get: { shared: true } },
  },
});
// <end_iface_implement>

// <start_iface_call>
// Call the interface from another handler — no implementation import needed
export const orchestrator = service({
  name: "orchestrator",
  handlers: {
    *run(itemId: string) {
      // Pass the interface directly to client()
      const newValue = yield* client(counterIface, itemId).increment(1);
      return `counter for ${itemId} is now ${newValue}`;
    },
  },
});
// <end_iface_call>

// <start_iface_schemas>
import { z } from "zod";

const CreateUserReq = z.object({
  username: z.string().min(3),
  role: z.enum(["admin", "user"]).default("user"),
});
const CreateUserRes = z.object({ id: z.string() });

// Use schemas() for Standard Schema validation (Zod, TypeBox, Valibot, …)
export const userIface = iface.service("users", {
  create: iface.schemas({ input: CreateUserReq, output: CreateUserRes }),
});

// Or use serdes() for custom Serde instances
import * as restate from "@restatedev/restate-sdk";
export const echoIface = iface.service("echo", {
  raw: iface.serdes({
    input: restate.serde.binary,
    output: restate.serde.binary,
  }),
});
// <end_iface_schemas>
