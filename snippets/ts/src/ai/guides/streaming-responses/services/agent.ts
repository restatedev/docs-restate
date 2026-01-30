import * as restate from "@restatedev/restate-sdk";
import { createPubsubClient } from "@restatedev/pubsub-client";

const pubsub = createPubsubClient({
    url: "http://localhost:8080",
    name: "pubsub",
});

// In your handler:
export const agent = restate.service({
    name: "MyAgent",
    handlers: {
        run: async (ctx: restate.Context, prompt: string) => {
            await pubsub.publish("session-123", { role: "user", content: prompt }, ctx.rand.uuidv4());
        },
    },
});
