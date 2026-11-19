// <start_test>
import {afterAll, beforeAll, expect, it, vi} from "vitest";
import {connect} from "@restatedev/restate-sdk-clients";
import {RestateContainer, RestateTestEnvironment} from "@restatedev/restate-sdk-testcontainers";
import {ticketDesk} from "../tools.js";

// Replace only the model provider. The services under test stay unchanged.
vi.mock("@restatedev/agentlib/provider", async () => {
  const {fixtureModel} = await import("./fixture-model.js");
  return {aiModel: () => fixtureModel};
});

let env: RestateTestEnvironment;

beforeAll(async () => {
  env = await RestateTestEnvironment.start({
    services: [ticketDesk],
    container: () => new RestateContainer().alwaysReplay().disableRetries(),
  });
}, 60_000);

afterAll(async () => {
  await env?.stop();
});

it("looks up the ticket before it answers", async () => {
  const restate = connect({url: env.baseUrl()});
  const answer = await restate.client(ticketDesk).ask("What is the status of T-42?");
  expect(answer).toBe("Ticket T-42 is open.");
});
// <end_test>
