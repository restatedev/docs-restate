import * as restate from "@restatedev/restate-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, wrapLanguageModel } from "ai";
import { z } from "zod";
import { durableCalls } from "./middleware";
import {RestatePromise} from "@restatedev/restate-sdk";
import {aw} from "vitest/dist/chunks/reporters.nr4dxCkA";

// External APIs that can fail due to rate limits, network issues, or service outages
async function logInteraction(customerId: string, summary: string) {
  const res = await fetch("https://api.salesforce.com/services/data/v60.0/sobjects/Case", {
    method: "POST",
    body: JSON.stringify({ 
      AccountId: customerId, 
      Subject: summary,
      Description: `Agent actions: ${actions}` 
    })
  });
  if (!res.ok) throw new Error(`CRM API failed: ${res.status}`);
  return res.json();
}

async function updateCustomerStatus(customerId: string, status: string) {
  const res = await fetch(`https://api.salesforce.com/services/data/v60.0/sobjects/Account/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify({ Status__c: status })
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
  return res.json();
}

async function createTicket(issue: string) {
  const res = await fetch("https://api.zendesk.com/tickets", {
    method: "POST",
    body: JSON.stringify({ subject: "Customer Issue", description: issue })
  });
  if (!res.ok) throw new Error(`Ticket API failed: ${res.status}`);
  return res.json();
}
const InteractionSummary = z.object({
  customerId: z.string(),
  summary: z.string(),
  actions: z.string()
})

function updateAuditTrail(interactionId, actions) {
  return undefined;
}

const supportAgent = async (restateContext: restate.Context, customerId: string, issue: string) => {
  // <start_here>
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(restateContext, { maxRetryAttempts: 3 }),
  });

  const { text } = await generateText({
    model,
    system: "You are a support agent. Help customers by creating tickets .",
    prompt: `Customer ${customerId} reported: ${issue}`,
    tools: {
      createTicket: tool({
        description: "Create support ticket for issues needing follow-up",
        inputSchema: z.object({ issue: z.string() }),
        execute: async ({ issue }) =>
            // Tool step with retries and success/failure persistence
            restateContext.run(`create ticket ${issue}`, () => createTicket(issue)),
      }),
      logToCrm: tool({
        description: "Log interaction and executed actions to CRM",
        inputSchema: InteractionSummary,
        execute: async ({ customerId, summary, actions }) => {
          // Workflow with multiple steps, each with retries and persistence
          const interactionId = await restateContext.run("log interaction", () => logInteraction(customerId, summary));
          await restateContext.run("log actions", () => updateAuditTrail(interactionId, actions));
        },
      }),
    },
  });
  // <end_here>

  return text;
}

export default restate.service({
  name: "SupportAgent",
  handlers: {
    run: async (ctx: restate.Context, { customerId, issue } : {customerId: string, issue: string} ) => {
      return supportAgent(ctx, customerId, issue)
    },
  },
});
// <end_here>
