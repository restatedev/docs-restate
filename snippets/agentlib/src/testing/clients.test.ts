// Runs the client snippets against a real Restate server with a fixture model.
import {afterAll, beforeAll, expect, it, vi} from "vitest";
import {connect, HttpCallError} from "@restatedev/restate-sdk-clients";
import {RestateContainer, RestateTestEnvironment} from "@restatedev/restate-sdk-testcontainers";
import {ask, askAndAttach, supportChat} from "../clients.js";

vi.mock("@restatedev/agentlib/provider", async () => {
  const {verifyModel} = await import("./verify-model.js");
  return {aiModel: () => verifyModel};
});

let env: RestateTestEnvironment;

beforeAll(async () => {
  env = await RestateTestEnvironment.start({
    services: [supportChat],
    container: () => new RestateContainer().alwaysReplay().disableRetries(),
  });
}, 60_000);

afterAll(async () => {
  await env?.stop();
});

const url = () => env.baseUrl();
const roles = async (chatId: string) =>
  (await connect({url: url()}).client(supportChat, chatId).history({})).messages.map((m: {role: string}) => m.role);

it("calls the agent", async () => {
  expect(await ask(url(), "c1", "hi")).toBe("the|users:1|hi");
  expect(await ask(url(), "c1", "again")).toBe("the|users:2|again");
});

it("sends a request and attaches to it", async () => {
  expect(await askAndAttach(url(), "c2", "hi", "req-1")).toBe("the|users:1|hi");
  // The same idempotency key returns the same answer and adds no turn
  expect(await askAndAttach(url(), "c2", "hi", "req-1")).toBe("the|users:1|hi");
  expect(await roles("c2")).toEqual(["user", "assistant"]);
});

it("serves the HTTP requests on the page", async () => {
  const call = await fetch(`${url()}/restate/call/SupportChat/c4/ask`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify("hi"),
  });
  expect(call.status).toBe(200);
  expect(await call.json()).toBe("the|users:1|hi");

  const send = await fetch(`${url()}/restate/send/SupportChat/c4/ask`, {
    method: "POST",
    headers: {"content-type": "application/json", "idempotency-key": "req-3"},
    body: JSON.stringify("again"),
  });
  const sent = (await send.json()) as {invocationId: string; status: string};
  expect(sent.status).toBe("Accepted");
  const attach = await fetch(`${url()}/restate/attach/${sent.invocationId}`);
  expect(attach.status).toBe(200);
  expect(await attach.json()).toBe("the|users:2|again");

  const history = await fetch(`${url()}/restate/call/SupportChat/c4/history`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({from: 2}),
  });
  const page = (await history.json()) as {messages: {role: string}[]; next: number};
  expect(page.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  expect(page.next).toBe(4);
});

it("reports a failed run to the client", async () => {
  const failed = await fetch(`${url()}/restate/call/SupportChat/c5/ask`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify("unanswerable"),
  });
  expect(failed.status).toBe(500);
  expect(await failed.json()).toEqual({code: 500, message: "The model is unavailable", source: "invocation"});
  // The TypeScript client throws HttpCallError
  const error = await ask(url(), "c5", "unanswerable").catch((e: unknown) => e);
  expect(error).toBeInstanceOf(HttpCallError);
  expect((error as HttpCallError).status).toBe(500);
  expect(JSON.parse((error as HttpCallError).responseText)).toMatchObject({message: "The model is unavailable"});
  // Each failed turn is saved with a note
  expect(await roles("c5")).toEqual(["user", "user", "user", "user"]);
});
