// Runs the documentation snippets against a real Restate server with a fixture model.
import {afterAll, beforeAll, expect, it, vi} from "vitest";
import {connect} from "@restatedev/restate-sdk-clients";
import {RestateContainer, RestateTestEnvironment} from "@restatedev/restate-sdk-testcontainers";
import type {ApprovalRequest} from "@restatedev/agentlib";
import {support, ticketTriage} from "../agents.js";
import {ticketApproval} from "../approval.js";
import {aiSession, chatSession, compactedChat, customSummaryChat, manualChat} from "../sessions.js";
import {racingAgents, racingSession, supportRouter, tripSession} from "../multi_agent.js";
import {hotelBooking} from "../guardrails.js";
import {refunds} from "../errors.js";
import {notifyReviewer} from "../services.js";

vi.mock("@restatedev/agentlib/provider", async () => {
  const {verifyModel} = await import("./verify-model.js");
  return {aiModel: () => verifyModel};
});

vi.mock("../services.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services.js")>();
  return {...original, notifyReviewer: vi.fn(async (_request: ApprovalRequest) => {})};
});

let env: RestateTestEnvironment;

beforeAll(async () => {
  env = await RestateTestEnvironment.start({
    services: [support, ticketTriage, ticketApproval, aiSession, chatSession, compactedChat, customSummaryChat, manualChat, supportRouter, racingAgents, racingSession, tripSession, hotelBooking, refunds],
    container: () => new RestateContainer().alwaysReplay().disableRetries(),
  });
}, 60_000);

afterAll(async () => {
  await env?.stop();
});

const ingress = () => connect({url: env.baseUrl()});

it("runs an agent in a service handler", async () => {
  expect(await ingress().client(support).ask("Hi")).toBe("support|users:1|Hi");
});

it("returns typed output", async () => {
  expect(await ingress().client(ticketTriage).classify("refund")).toEqual({category: "billing", summary: "refund"});
});

it("keeps conversation history per key", async () => {
  await ingress().client(chatSession, "bob").ask("one");
  expect(await ingress().client(chatSession, "bob").ask("two")).toBe("the|users:2|two");
  expect(await ingress().client(chatSession, "alice").ask("one")).toBe("the|users:1|one");
  const page = await ingress().client(chatSession, "bob").history({});
  expect(page.messages.map((m: {role: string}) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
  await ingress().client(manualChat, "bob").ask("one");
  expect(await ingress().client(manualChat, "bob").ask("two")).toBe("the|users:2|two");
});

it("keeps a failed turn with a note on the failure", async () => {
  const chat = ingress().client(chatSession, "gina");
  await chat.ask("one");
  await expect(chat.ask("unanswerable")).rejects.toThrow("The model is unavailable");
  const page = await chat.history({});
  expect(page.messages.map((m: {role: string}) => m.role)).toEqual(["user", "assistant", "user", "user"]);
  expect(JSON.parse((page.messages[3] as {content: string}).content)).toMatchObject({source: "agent-runtime", type: "run-failed"});
  expect(await chat.ask("two")).toBe("the|users:4|two");
  const manual = ingress().client(manualChat, "gina");
  await manual.ask("one");
  await expect(manual.ask("unanswerable")).rejects.toThrow("The model is unavailable");
  expect(await manual.ask("two")).toBe("the|users:4|two");
});

it("paginates long conversations across chunks", async () => {
  const client = ingress().client(chatSession, "carol");
  for (let i = 1; i <= 51; i++) await client.ask(`m${i}`);
  const first = await client.history({});
  expect(first.messages).toHaveLength(100);
  expect(first.next).toBe(100);
  const second = await client.history({from: first.next, limit: 1});
  expect(second.messages).toEqual([{role: "user", content: "m51"}]);
  expect(second.next).toBe(101);
  const third = await client.history({from: second.next});
  expect(third.messages).toEqual([{role: "assistant", content: "the|users:51|m51"}]);
  expect(third.next).toBe(102);
  expect(await client.history({from: third.next})).toEqual({messages: [], next: 102});
  expect(await client.ask("last")).toBe("the|users:52|last");
});

it("reads the conversation with lazy state", async () => {
  for (let i = 1; i <= 17; i++) await ingress().client(aiSession, "erin").doTurn(`m${i}`);
  const page = await ingress().client(aiSession, "erin").history({});
  expect(page.next).toBe(34); // 34 messages in five chunks of 8
  expect(await ingress().client(aiSession, "erin").history({from: 31, limit: 2})).toEqual({
    messages: page.messages.slice(31, 33), next: 33,
  });
  expect(await ingress().client(aiSession, "erin").doTurn("last")).toBe("the|users:18|last");
});

it("stores a run's summary in the conversation", async () => {
  const chat = ingress().client(compactedChat, "dave");
  // About 7,500 tokens per message: the fifth turn's request exceeds maxTokens (64,000)
  const ask = (i: number) => chat.ask(`m${i} ${"x".repeat(30_000)}`);
  for (let i = 1; i <= 4; i++) expect(await ask(i)).toMatch(new RegExp(`^the\\|users:${i}\\|m${i} `));
  // The run summarizes all but the newest two messages: summary + m5
  expect(await ask(5)).toMatch(/^the\|users:2\|m5 /);
  const state = await env.stateOf(compactedChat, "dave").getAll<Record<string, unknown>>();
  expect(state["conversation/meta"]).toEqual({count: 10});
  expect(state["conversation/summary"]).toEqual({through: 7, text: "Earlier turns, summarized"});
  // The next run starts from the stored summary: summary + m5 + m6
  expect(await ask(6)).toMatch(/^the\|users:3\|m6 /);
  const after = await env.stateOf(compactedChat, "dave").getAll<Record<string, unknown>>();
  // The state keeps every message, in chunks of 8
  expect((after["conversation/0"] as unknown[]).length).toBe(8);
  expect((after["conversation/1"] as unknown[]).length).toBe(4);
}, 120_000);

it("summarizes with custom compaction instructions", async () => {
  const chat = ingress().client(customSummaryChat, "frank");
  // About 25,000 tokens per turn: the eighth turn's request exceeds the default maxTokens (170,000)
  for (let i = 1; i <= 7; i++) await chat.ask(`m${i} ${"x".repeat(50_000)}`);
  const before = await env.stateOf(customSummaryChat, "frank").getAll<Record<string, unknown>>();
  expect(before["conversation/meta"]).toEqual({count: 14});
  expect(before["conversation/summary"]).toBeUndefined();
  await chat.ask(`m8 ${"x".repeat(50_000)}`);
  const state = await env.stateOf(customSummaryChat, "frank").getAll<Record<string, unknown>>();
  expect(state["conversation/summary"]).toMatchObject({text: "Open requests and order IDs"});
}, 120_000);

it("routes to a specialist", async () => {
  expect(await ingress().client(supportRouter).ask("my invoice")).toBe("billing|users:1|my invoice");
});

it("races agents and fails terminally when every run fails", async () => {
  expect(await ingress().client(racingAgents).ask("hi")).toMatch(/\|users:1\|hi$/);
  await expect(ingress().client(racingAgents).ask("unanswerable")).rejects.toThrow("No agent produced an answer");
});

it("keeps a conversation per parallel agent", async () => {
  await ingress().client(tripSession, "trip").plan("Lisbon");
  expect(await ingress().client(tripSession, "trip").plan("May")).toEqual({
    flights: "flights|users:2|May",
    hotels: "hotels|users:2|May",
  });
  const state = await env.stateOf(tripSession, "trip").getAll();
  expect(Object.keys(state).sort()).toEqual([
    "conversation/flights/0", "conversation/flights/meta", "conversation/hotels/0", "conversation/hotels/meta",
  ]);
});

it("saves only the winner of a race to the conversation", async () => {
  await ingress().client(racingSession, "race").ask("one");
  expect(await ingress().client(racingSession, "race").ask("two")).toMatch(/\|users:2\|two$/);
  const state = await env.stateOf(racingSession, "race").getAll<Record<string, unknown>>();
  expect(state["conversation/meta"]).toEqual({count: 4});
  expect((state["conversation/0"] as {role: string}[]).map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
});

it.each([
  ["Close T-42", ["T-42"]],
  ["Close T-41 and T-42", ["T-41", "T-42"]],
])("waits for every reviewer decision: %s", async (message, ticketIds) => {
  const notifications = vi.mocked(notifyReviewer);
  notifications.mockClear();
  const client = ingress().client(ticketApproval);
  const pending = client.ask(message);
  let settled = false;
  void pending.then(
    () => {settled = true;},
    () => {settled = true;},
  );
  await vi.waitFor(() => expect(notifications).toHaveBeenCalledTimes(ticketIds.length), {timeout: 3000});
  const requests = notifications.mock.calls.map(([request]) => request);
  expect(requests.map((request) => request.call.input)).toEqual(
    expect.arrayContaining(ticketIds.map((ticketId) => ({ticketId}))),
  );
  expect(new Set(requests.map((request) => request.signalName)).size).toBe(ticketIds.length);
  // Resolve in reverse order: every notification must remain independently usable.
  for (const request of requests.toReversed()) {
    expect(settled).toBe(false);
    await client.approve({...request, approved: true});
  }
  const results = JSON.parse(await pending);
  expect(results).toHaveLength(ticketIds.length);
  expect(results).toEqual(expect.arrayContaining(
    ticketIds.map((ticketId) => ({status: "success", output: {ticketId, status: "closed"}})),
  ));
  // Forced replay must reuse the journaled notification results.
  expect(notifications).toHaveBeenCalledTimes(ticketIds.length);
});

it("lets the model handle errors and stops the run on AgentTerminalError", async () => {
  const handle = (message: string) => ingress().client(refunds).handle({customerId: "c1", message});
  expect(await handle("O-1")).toContain("re_O-1");
  expect(await handle("missing")).toContain('"code":"not_found"');
  expect(await handle("done")).toContain('"code":"tool_failed"');
  expect(await handle("other")).toBe("Request refused: The order belongs to another customer");
});

it("denies a tool call in before", async () => {
  const quote = {hotelId: "H1", quotedTotalCents: 100, maxTotalCents: 200};
  expect(await ingress().client(hotelBooking).book({request: "H2", quote})).toContain("Only the quoted hotel");
  expect(await ingress().client(hotelBooking).book({request: "H1", quote})).toContain("bk_H1");
});
