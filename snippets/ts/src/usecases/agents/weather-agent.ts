import * as restate from "@restatedev/restate-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool, wrapLanguageModel } from "ai";
import { z } from "zod";
import { durableCalls } from "./middleware";

async function createEmailAccount(name: string, team: string) {
  // Mock: Simulate email account creation
  return {
    email: `${name.toLowerCase()}@company.com`,
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    team: team,
    status: "created",
  };
}

async function orderLaptop(name: string, job: string) {
  // Mock: Simulate laptop reservation
  const laptopType = job === "developer" ? "macbook-pro" : "macbook-air";
  return `laptop_${laptopType}_${Math.random().toString(36).substr(2, 6)}`;
}

async function createKeyCard(name: string, team: string) {
  // Mock: Simulate keycard creation
  return {
    cardId: `card_${Math.random().toString(36).substr(2, 8)}`,
    name: name,
    permissions: [`team-${team}`, "building-main"],
    status: "ordered",
  };
}

async function orderHoodie(name: string, team: string) {
  // Mock: Simulate hoodie order
  return {
    orderId: `hoodie_${Math.random().toString(36).substr(2, 8)}`,
    name: name,
    team: team,
    size: "M", // Default size
    status: "ordered",
  };
}

async function addToTeamGroups(userId: string, team: string) {
  // Mock: Add user to team distribution lists and Slack channels
  return {
    groups: [`${team}@company.com`, `${team}-announcements@company.com`],
    slackChannels: [`#${team}`, `#${team}-random`],
    status: "added",
  };
}

async function sendWelcomeEmail(email: string, name: string) {
  // Mock: Send welcome email with login instructions
  return {
    to: email,
    subject: `Welcome to the company, ${name}!`,
    templateId: "welcome-template-v2",
    status: "sent",
  };
}

function getOnboardingPlan(name: string, team: string, job: string) {
  // Mock: Return onboarding checklist
  return {
    employee: name,
    team: team,
    role: job,
    checklist: ["Reserve laptop", "Create email account"],
  };
}

const OnboardingInfo = z.object({
  name: z.string(),
  team: z.string(),
  job: z.string(),
});

const runOnboardingAgent = async (
  restateContext: restate.Context,
  name: string,
  team: string,
  job: string
) => {
  const createEmail = tool({
    description: "Create company email account for new employee",
    inputSchema: z.object({ name: z.string(), team: z.string() }),
    execute: async ({ name, team }) => {
      return await restateContext
        .workflowClient(emailCreationWorkflow, name)
        .run({ name, team });
    },
  });
  const reserveLaptop = tool({
    description: "Reserve laptop and equipment for employee",
    inputSchema: z.object({ name: z.string(), job: z.string() }),
    execute: async ({ name, job }) =>
      restateContext.run("reserve laptop", () => orderLaptop(name, job)),
  });
  const orderKeyCard = tool({
    description: "Order building access card for employee",
    inputSchema: z.object({ name: z.string(), team: z.string() }),
    execute: async ({ name, team }) =>
      restateContext.run("create keycard", () => createKeyCard(name, team)),
  });
  const orderPersonalizedHoodie = tool({
    description: "Order building access card for employee",
    inputSchema: z.object({ name: z.string(), team: z.string() }),
    execute: async ({ name, team }) =>
      restateContext.run("order hoodie", () => orderHoodie(name, team)),
  });

  // <start_here>
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(restateContext, { maxRetryAttempts: 3 }),
  });

  await generateText({
    model,
    system: "You are an employee onboarding agent.",
    prompt: `Onboard employee ${name} in team ${team}, as ${job}. First get the onboarding plan and then execute it.`,
    tools: {
      getOnboardingPlan: tool({
        description: "Get onboarding plan for team and job",
        inputSchema: OnboardingInfo,
        execute: async ({ name, team, job }) =>
          restateContext.run("get onboarding plan", () =>
            getOnboardingPlan(name, team, job)
          ),
      }),
      createEmail,
      reserveLaptop,
      orderKeyCard,
      orderPersonalizedHoodie,
    },
    stopWhen: [stepCountIs(10)],
    providerOptions: { openai: { parallelToolCalls: false } },
  });
  // <end_here>

  return "done!";
};

// Alternative example: Employee Onboarding Agent
const onboardingAgent = restate.service({
  name: "OnboardingAgent",
  handlers: {
    run: async (
      ctx: restate.Context,
      { name, team, job }: { name: string; team: string; job: string }
    ) => {
      return runOnboardingAgent(ctx, name, team, job);
    },
  },
});
// <end_here>

const emailCreationWorkflow = restate.workflow({
  name: "EmailCreationWorkflow",
  handlers: {
    run: async (
      ctx: restate.WorkflowContext,
      { name, team }: { name: string; team: string }
    ) => {
      // Multi-step workflow: each step is durable and retried independently
      const account = await ctx.run("create email account", () =>
        createEmailAccount(name, team)
      );
      await ctx.run("add to team groups", () =>
        addToTeamGroups(account.userId, team)
      );
      return account;
    },
  },
});

restate.serve({ services: [onboardingAgent, emailCreationWorkflow] });
