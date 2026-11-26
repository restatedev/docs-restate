import * as restate from "@restatedev/restate-sdk-gen";
import {TerminalError} from "@restatedev/restate-sdk";
import {agent, skills} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";

// <start_overview>
// <start_define>
const assistant = agent({
  model,
  instructions: "Answer support questions briefly.",
  maxSteps: 6,
});
// <end_define>

// <start_run>
export const support = restate.service({
  name: "Support",
  handlers: {
    *ask(question: string) {
      const result = yield* assistant.run(question);
      if (result.status !== "completed") return result.output ?? result.reason;
      return result.output;
    },
  },
});
// <end_run>
// <end_overview>

// <start_output>
const triage = agent({
  model,
  instructions: "Classify the support request and summarize it in one sentence.",
  output: z.object({
    category: z.enum(["billing", "technical", "other"]),
    summary: z.string(),
  }),
});

export const ticketTriage = restate.service({
  name: "TicketTriage",
  handlers: {
    *classify(message: string) {
      const result = yield* triage.run(message);
      if (result.status !== "completed") {
        throw new TerminalError(`Triage ${result.status}: ${result.reason}`);
      }
      return result.output; // {category, summary}
    },
  },
});
// <end_output>

// <start_context>
type Customer = {customerId: string; plan: "free" | "pro"};

const accountAgent = agent<Customer>({
  model,
  *instructions({context}) {
    return `You help customer ${context.customerId}, who is on the ${context.plan} plan.`;
  },
});

export const accounts = restate.object({
  name: "Accounts",
  handlers: {
    *ask(question: string) {
      const customerId = restate.handlerRequest().key!;
      const plan = (yield* restate.state().get<"free" | "pro">("plan")) ?? "free";
      const result = yield* accountAgent.run(question, {context: {customerId, plan}});
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});
// <end_context>

// <start_skills>
const writer = agent({
  model,
  instructions: "You write for a software team.",
  skills: skills([
    {
      name: "release-notes",
      description: "Write release notes from a list of changes.",
      instructions: "Group the changes into Added, Changed, and Fixed. Follow the layout in template.md.",
      files: {"template.md": "## <version>\n### Added\n...\n### Changed\n...\n### Fixed\n..."},
    },
  ]),
});
// <end_skills>

export const writing = restate.service({
  name: "Writing",
  handlers: {
    *write(task: string) {
      const result = yield* writer.run(task);
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});
