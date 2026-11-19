import * as restate from "@restatedev/restate-sdk-gen";
import {journaledModel, type ModelRequest} from "@restatedev/agentlib";

// <start_openai>
import {openai} from "@ai-sdk/openai";
import {aiModel} from "@restatedev/agentlib/provider";

const model = aiModel({model: openai("gpt-5.6-luna")});
// <end_openai>

// <start_anthropic>
import {anthropic} from "@ai-sdk/anthropic";

const claude = aiModel({
  model: anthropic("claude-sonnet-5-5"),
  retry: {maxAttempts: 5, initialInterval: {milliseconds: 500}, exponentiationFactor: 2},
});
// <end_anthropic>

// <start_reasoning>
const thinkingModel = aiModel({
  model: anthropic("claude-sonnet-5-5"),
  providerOptions: {anthropic: {thinking: {type: "adaptive"}}},
});
// <end_reasoning>

// <start_gateway>
import {modelGateway} from "@restatedev/agentlib/provider";

// A service that owns the provider keys, quotas, and routing.
export const modelService = restate.service({
  name: "ModelService",
  handlers: {
    *generate(request: ModelRequest) {
      return yield* model(request);
    },
  },
});

// Agents in other services send their model requests to it.
const viaGateway = modelGateway((request) => restate.client(modelService).generate(request));
// <end_gateway>

declare const myLlmClient: {
  complete(request: ModelRequest, options: {signal: AbortSignal}): Promise<{text: string}>;
};

// <start_custom>
const customModel = journaledModel(async (request, {signal}) => {
  const response = await myLlmClient.complete(request, {signal});
  return {type: "final", text: response.text};
});
// <end_custom>

export const models = {claude, thinkingModel, viaGateway, customModel};
