import * as restate from "@restatedev/restate-sdk-gen";
import {TerminalError} from "@restatedev/restate-sdk";
import {agent, agentTool, forkAgentTool, handoff, LazyStateConversation, type Agent, type Message} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";

const billing = agent({model, instructions: "Answer billing questions."});
const account = agent({model, instructions: "Answer account questions."});
const product = agent({model, instructions: "Answer product questions."});

// <start_routing>
const router = agent({
  model,
  instructions: "Choose the one specialist best suited to the question. Classify only.",
  output: z.object({specialist: z.enum(["billing", "account", "product"])}),
});
const specialists = {billing, account, product};

export const supportRouter = restate.service({
  name: "SupportRouter",
  handlers: {
    *ask(question: string) {
      const routed = yield* router.run(question, {name: "router"});
      if (routed.status !== "completed") throw new TerminalError(`Router ${routed.status}`);
      const result = yield* specialists[routed.output.specialist].run(question, {name: "specialist"});
      if (result.status !== "completed") return result.output ?? result.reason;
      return result.output;
    },
  },
});
// <end_routing>

const writer = agent({
  model,
  instructions: "Write or revise the code for the task. Apply the feedback.",
  output: z.object({code: z.string()}),
});
const reviewer = agent({
  model,
  instructions: "Review the code against the task.",
  output: z.object({approved: z.boolean(), feedback: z.string()}),
});

export const codeReview = restate.service({
  name: "CodeReview",
  handlers: {
    *write(task: string) {
      // <start_loop>
      let code = "";
      let feedback = "";
      for (let i = 1; i <= 3; i++) {
        const draft = yield* writer.run(JSON.stringify({task, code, feedback}), {name: `write-${i}`});
        if (draft.status !== "completed") throw new TerminalError(`Writer ${draft.status}`);
        code = draft.output.code;
        const review = yield* reviewer.run(JSON.stringify({task, code}), {name: `review-${i}`});
        if (review.status !== "completed") throw new TerminalError(`Reviewer ${review.status}`);
        if (review.output.approved) return code;
        feedback = review.output.feedback;
      }
      return code;
      // <end_loop>
    },
  },
});

const fast = agent({model, instructions: "Answer quickly and briefly."});
const thorough = agent({model, instructions: "Answer thoroughly."});

// <start_race>
function* answerWith(name: string, candidate: Agent<undefined>, question: string, messages: readonly Message[] = []) {
  const result = yield* candidate.run(question, {name, messages});
  if (result.status !== "completed") throw new TerminalError(`${name} ${result.status}`);
  return result;
}

function* firstSuccess<T>(tasks: restate.Task<T>[]) {
  try {
    return yield* restate.any(tasks); // the first success wins
  } catch (error) {
    // Every run failed terminally: stop retrying the handler
    const failures: unknown[] = error instanceof AggregateError ? error.errors : [];
    if (failures.length && failures.every((e) => e instanceof TerminalError)) {
      throw new TerminalError("No agent produced an answer");
    }
    throw error;
  } finally {
    for (const task of tasks) task.interrupt(); // cancel the other runs
    yield* restate.allSettled(tasks);
  }
}

export const racingAgents = restate.service({
  name: "RacingAgents",
  handlers: {
    *ask(question: string) {
      const winner = yield* firstSuccess([
        restate.spawn(answerWith("fast", fast, question)),
        restate.spawn(answerWith("thorough", thorough, question)),
      ]);
      return winner.output;
    },
  },
});
// <end_race>

const flightAgent = agent({model, instructions: "Find flights for the trip."});
const hotelAgent = agent({model, instructions: "Find hotels for the trip."});

// <start_parallel_conversations>
export const tripSession = restate.object({
  name: "TripSession",
  handlers: {
    *plan(request: string) {
      const [flights, hotels] = yield* restate.all([
        restate.spawn(flightAgent.run(request, {
          name: "flights",
          conversation: new LazyStateConversation({stateKey: "conversation/flights"}),
        })),
        restate.spawn(hotelAgent.run(request, {
          name: "hotels",
          conversation: new LazyStateConversation({stateKey: "conversation/hotels"}),
        })),
      ]);
      return {flights: flights.output, hotels: hotels.output};
    },
  },
  options: {
    state: {
      preload: [
        "conversation/flights/meta", "conversation/flights/summary",
        "conversation/hotels/meta", "conversation/hotels/summary",
      ],
    },
  },
});
// <end_parallel_conversations>

// <start_race_conversation>
export const racingSession = restate.object({
  name: "RacingSession",
  handlers: {
    *ask(question: string) {
      const conversation = new LazyStateConversation();
      const {messages, version} = yield* conversation.load();
      const winner = yield* firstSuccess([
        restate.spawn(answerWith("fast", fast, question, messages)),
        restate.spawn(answerWith("thorough", thorough, question, messages)),
      ]);
      // Save only the winner's turn: its messages after the loaded history
      yield* conversation.append(winner.messages.slice(messages.length), version);
      return winner.output;
    },
  },
  options: {state: {preload: ["conversation/meta", "conversation/summary"]}},
});
// <end_race_conversation>

const planner = agent({
  model,
  instructions: "Split the topic into at most three research questions.",
  output: z.object({questions: z.array(z.string()).max(3)}),
});
const researcher = agent({model, instructions: "Research the question and answer it."});
const reportWriter = agent({model, instructions: "Write a report from the findings."});

// <start_workers>
export const researchWorker = restate.service({
  name: "ResearchWorker",
  handlers: {
    *research(question: string) {
      const result = yield* researcher.run(question);
      if (result.status !== "completed") throw new TerminalError(`Research ${result.status}`);
      return result.output;
    },
  },
});

export const researchReport = restate.service({
  name: "ResearchReport",
  handlers: {
    *generate(topic: string) {
      const plan = yield* planner.run(topic, {name: "planner"});
      if (plan.status !== "completed") throw new TerminalError(`Planner ${plan.status}`);
      const findings = yield* restate.all(
        plan.output.questions.map((question) => restate.client(researchWorker).research(question)),
      );
      const report = yield* reportWriter.run(JSON.stringify({topic, findings}), {name: "writer"});
      if (report.status !== "completed") throw new TerminalError(`Writer ${report.status}`);
      return report.output;
    },
  },
});
// <end_workers>

// <start_in_run>
const lead = agent({
  model,
  instructions: "Answer customer questions. Delegate research, and transfer billing questions.",
  tools: {
    research: agentTool(researcher, {description: "Research one question in depth."}),
    toBilling: handoff(billing, "Transfer billing questions to the billing specialist."),
  },
});
// <end_in_run>

// <start_fork>
const investigator = agent({
  model,
  instructions: "Investigate incidents. Check plausible causes in parallel with investigate.",
  tools: {
    investigate: forkAgentTool({
      description: "Check one hypothesis with a copy of yourself that sees this conversation.",
    }),
  },
});
// <end_fork>

export const agents = {lead, investigator};
