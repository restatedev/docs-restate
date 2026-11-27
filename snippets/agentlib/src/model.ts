import {openai} from "@ai-sdk/openai";
import {aiModel} from "@restatedev/agentlib/provider";

// The model the snippets share. Tests replace aiModel with a fixture model.
export const model = aiModel({model: openai("gpt-5.6-luna")});
