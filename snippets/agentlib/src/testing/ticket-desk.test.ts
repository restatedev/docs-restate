// <start_test>
import {afterAll, beforeAll, expect, it, vi} from "vitest";
import {connect} from "@restatedev/restate-sdk-clients";
import {RestateContainer, RestateTestEnvironment} from "@restatedev/restate-sdk-testcontainers";
import {ticketDesk} from "../tools.js";
import {fetchTicket} from "../services.js";

// Replace the model provider and observe the ticket API calls.
vi.mock("@restatedev/agentlib/provider", async () => {
  const {fixtureModel} = await import("./fixture-model.js");
  return {aiModel: () => fixtureModel};
});

vi.mock("../services.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services.js")>();
  return {...original, fetchTicket: vi.fn(original.fetchTicket)};
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

it("looks up the ticket once despite replay before it answers", async () => {
  vi.mocked(fetchTicket).mockClear();
  const restate = connect({url: env.baseUrl()});
  const answer = await restate.client(ticketDesk).ask("What is the status of T-42?");
  expect(answer).toBe("Ticket T-42 is open.");
  expect(fetchTicket).toHaveBeenCalledExactlyOnceWith("T-42", {signal: expect.any(AbortSignal)});
});

it("fails when the lookup does not return a ticket", async () => {
  vi.mocked(fetchTicket).mockResolvedValueOnce(undefined);
  const restate = connect({url: env.baseUrl()});
  await expect(restate.client(ticketDesk).ask("What is the status of T-42?")).rejects.toThrow(
    "Fixture expected a successful lookupTicket result",
  );
});
// <end_test>
