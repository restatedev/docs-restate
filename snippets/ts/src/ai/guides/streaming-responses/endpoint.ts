import * as restate from "@restatedev/restate-sdk/fetch";
import { createPubsubObject } from "@restatedev/pubsub";
import { agent } from "./services/agent";

const pubsub = createPubsubObject("pubsub", {});

export const endpoint = restate.createEndpointHandler({
    services: [agent, pubsub],
});