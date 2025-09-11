import * as restate from "@restatedev/restate-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, wrapLanguageModel } from "ai";
import { z } from "zod";
import { durableCalls } from "./middleware";
import {RestatePromise} from "@restatedev/restate-sdk";
import {aw} from "vitest/dist/chunks/reporters.nr4dxCkA";

// External APIs that can fail due to rate limits, network issues, or service outages
async function logInCRM(customerId: string, ticketId: string, summary: string) {

}

async function createTicket(issue: string): Promise<string> {
  return "ticket123"; // Placeholder ticket ID
}
const InteractionSummary = z.object({
  customerId: z.string(),
  summary: z.string(),
  actions: z.string()
})

function updateAuditTrail(ticketId: string, summary: string) {
  return undefined;
}

// Onboarding APIs - critical operations that shouldn't be duplicated
async function createEmailAccount(name: string, team: string) {
  const res = await fetch("https://api.google.com/admin/directory/v1/users", {
    method: "POST",
    body: JSON.stringify({ 
      name: { givenName: name },
      primaryEmail: `${name.toLowerCase()}@company.com`,
      orgUnitPath: `/teams/${team}`
    })
  });
  if (!res.ok) throw new Error(`Email creation failed: ${res.status}`);
  return res.json();
}

async function reserveLaptop(name: string, job: string) {
  const res = await fetch("https://api.inventory.com/reserve", {
    method: "POST",
    body: JSON.stringify({ 
      type: job === "developer" ? "macbook-pro" : "macbook-air",
      assignee: name 
    })
  });
  if (!res.ok) throw new Error(`Laptop reservation failed: ${res.status}`);
  return res.json().then(r => r.machineId);
}

async function installSoftware(machineId: string, job: string) {
  const res = await fetch(`https://api.mdm.com/machines/${machineId}/install`, {
    method: "POST",
    body: JSON.stringify({
      packages: job === "developer" ? ["vscode", "docker", "git"] : ["slack", "zoom"]
    })
  });
  if (!res.ok) throw new Error(`Software install failed: ${res.status}`);
  return res.json();
}

async function orderKeyCard(name: string, team: string) {
  const res = await fetch("https://api.access-control.com/cards", {
    method: "POST", 
    body: JSON.stringify({ name, permissions: [`team-${team}`, "building-main"] })
  });
  if (!res.ok) throw new Error(`Keycard order failed: ${res.status}`);
  return res.json();
}

function getOnboardingPlan(name, team, job) {
  return undefined;
}

const onboardingAgent = async (restateContext: restate.Context, name: string, team: string, job: string) => {
  // <start_here>
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(restateContext, { maxRetryAttempts: 3 }),
  });

  const { text } = await generateText({
    model,
    system: "You are an employee onboarding agent, use the correct tools to help with the onboarding process.",
    prompt: `Employee ${name} is joining team ${team}, as ${job}`,
    tools: {
      getOnboardingPlanForTeamAndJob: tool({
        description: "Create company email account for new employee",
        inputSchema: z.object({ name: z.string(), team: z.string(), job: z.string() }),
        execute: async ({ name, team, job }) =>
          restateContext.run("get plan", () => getOnboardingPlan(name, team, job)),
      }),
      createEmail: tool({
        description: "Create company email account for new employee",
        inputSchema: z.object({ name: z.string(), team: z.string() }),
        execute: async ({ name, team }) =>
          restateContext.run("create email", () => createEmailAccount(name, team)),
      }),
      reserveMachine: tool({
        description: "Reserve laptop and equipment for employee",
        inputSchema: z.object({ name: z.string(), job: z.string() }),
        execute: async ({ name, job }) =>
          restateContext.run("reserve laptop", () => reserveLaptop(name, job))
      }),
      createKeyCard: tool({
        description: "Order building access card for employee",
        inputSchema: z.object({ name: z.string(), team: z.string() }),
        execute: async ({ name, team }) =>
          restateContext.run("create keycard", () => orderKeyCard(name, team)),
      }),
    },
  });
  // <end_here>

  return text;
}

const supportAgent = async (restateContext: restate.Context, customerId: string, issue: string) => {
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(restateContext, { maxRetryAttempts: 3 }),
  });

  const { text } = await generateText({
    model,
    system: "You are a support agent. Help customers by creating tickets.",
    prompt: `Customer ${customerId} reported: ${issue}`,
    tools: {
      createTicket: tool({
        description: "Create support ticket for issues needing follow-up",
        inputSchema: z.object({ summary: z.string() }),
        execute: async ({ summary }) => {
          const ticketId = await restateContext.run("create ticket", () => createTicket(summary));
          await restateContext.run("log interaction", () => logInCRM(customerId, ticketId, summary));
          return { ticketId };
        },
      }),
    },
  });

  return text;
}

// Alternative example: Employee Onboarding Agent
export const OnboardingAgent = restate.service({
  name: "OnboardingAgent", 
  handlers: {
    run: async (ctx: restate.Context, { name, team, job }: { name: string, team: string, job: string }) => {
      return onboardingAgent(ctx, name, team, job);
    },
  },
});

// Original example: Customer Support Agent  
export default restate.service({
  name: "SupportAgent",
  handlers: {
    run: async (ctx: restate.Context, { customerId, issue }: { customerId: string, issue: string }) => {
      return supportAgent(ctx, customerId, issue);
    },
  },
});
// <end_here>
