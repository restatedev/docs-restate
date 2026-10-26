import { TerminalError } from "@restatedev/restate-sdk";
import { RestateTestEnvironment } from "@restatedev/restate-sdk-testcontainers";
import * as clients from "@restatedev/restate-sdk-clients";
import { clients as genClients } from "@restatedev/restate-sdk-gen";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  userService,
  summaryService,
  coordinationService,
} from "./durable_coroutines";
import { existingService } from "./durable_coroutines_exec";
import {
  fetchUser,
  fetchOrders,
  recordAudit,
} from "./durable_coroutines_helpers";

vi.mock("./durable_coroutines_helpers", () => ({
  recordAudit: vi.fn(async () => {}),
  fetchUser: vi.fn(async (id: string) => {
    if (id === "failed") throw new TerminalError("User unavailable");
    return { id, name: `User ${id}` };
  }),
  fetchOrders: vi.fn(async (userId: string) => {
    if (userId === "slow") {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
    }
    return [{ id: `order-${userId}`, userId }];
  }),
}));

describe("Durable coroutine examples", () => {
  let env: RestateTestEnvironment;
  let ingress: clients.Ingress;

  beforeAll(async () => {
    env = await RestateTestEnvironment.start({
      services: [
        userService,
        summaryService,
        existingService,
        coordinationService,
      ],
      alwaysReplay: true,
    });
    ingress = clients.connect({ url: env.baseUrl() });
  }, 120_000);

  afterAll(async () => {
    await env?.stop();
  });

  it("runs a generator handler", async () => {
    expect(
      await genClients
        .client(genClients.connect({ url: env.baseUrl() }), userService)
        .greet("hello")
    ).toBe("Hello, User hello!");
  });

  it("joins routines in input order without repeating journaled steps", async () => {
    expect(
      await genClients
        .client(genClients.connect({ url: env.baseUrl() }), summaryService)
        .summaries(["first", "second"])
    ).toEqual([
      { name: "User first", orderCount: 1 },
      { name: "User second", orderCount: 1 },
    ]);
    for (const id of ["first", "second"]) {
      expect(
        vi.mocked(fetchUser).mock.calls.filter(([userId]) => userId === id)
      ).toHaveLength(1);
      expect(
        vi.mocked(fetchOrders).mock.calls.filter(([userId]) => userId === id)
      ).toHaveLength(1);
    }
  });

  it("unwraps the winning coroutine", async () => {
    expect(
      await genClients
        .client(genClients.connect({ url: env.baseUrl() }), summaryService)
        .withTimeout({ userId: "winner", budgetSeconds: 30 })
    ).toEqual({ name: "User winner", orderCount: 1 });
  });

  it("returns the timeout error when the deadline wins", async () => {
    await expect(
      genClients
        .client(genClients.connect({ url: env.baseUrl() }), summaryService)
        .withTimeout({ userId: "slow", budgetSeconds: 0.1 })
    ).rejects.toThrow("Loading the summary timed out");
  });

  it("executes a coroutine in a standard SDK handler", async () => {
    expect(
      await ingress.serviceClient(existingService).summary("existing")
    ).toEqual({ name: "User existing", orderCount: 1 });
  });

  it("shares context with spawned routines and isolates concurrent invocations", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      coordinationService
    );
    const results = await Promise.all([
      client.auditedSummaries({
        requestId: "request-a",
        userIds: ["context-a1", "context-a2"],
      }),
      client.auditedSummaries({
        requestId: "request-b",
        userIds: ["context-b"],
      }),
    ]);
    expect(results.map((summaries) => summaries.length)).toEqual([2, 1]);
    expect(vi.mocked(recordAudit).mock.calls).toHaveLength(3);
    expect(recordAudit).toHaveBeenCalledWith("request-a", "context-a1");
    expect(recordAudit).toHaveBeenCalledWith("request-a", "context-a2");
    expect(recordAudit).toHaveBeenCalledWith("request-b", "context-b");
  });

  it("finishes the current summary and returns partial results after a stop", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      coordinationService
    );
    expect(
      await client.summariesWithBudget({
        userIds: ["slow", "not-started"],
        budgetSeconds: 0.3,
      })
    ).toEqual([{ name: "User slow", orderCount: 1 }]);
    expect(fetchUser).not.toHaveBeenCalledWith("not-started");
  });

  it("returns all results when the worker finishes before the budget", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      coordinationService
    );
    expect(
      await client.summariesWithBudget({
        userIds: ["complete"],
        budgetSeconds: 30,
      })
    ).toEqual([{ name: "User complete", orderCount: 1 }]);
  });

  it("stops a worker while it waits between summaries", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      coordinationService
    );
    expect(
      await client.summariesWithBudget({
        userIds: ["never-started"],
        budgetSeconds: 0.01,
      })
    ).toEqual([]);
    expect(fetchUser).not.toHaveBeenCalledWith("never-started");
  });

  it("race propagates the first error", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      summaryService
    );
    await expect(client.firstResult(["failed", "slow"])).rejects.toThrow(
      "User unavailable"
    );
  });

  it("any returns a successful result despite a failed input", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      summaryService
    );
    expect(await client.firstSuccess(["failed", "success"])).toEqual({
      name: "User success",
      orderCount: 1,
    });
  });

  it("allSettled preserves the order of successful and failed outcomes", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      summaryService
    );
    const results = await client.settled(["settled-success", "failed"]);
    expect(results[0]).toEqual({
      status: "fulfilled",
      value: { name: "User settled-success", orderCount: 1 },
    });
    expect(results[1].status).toBe("rejected");
  });

  it("select identifies the branch whose future is unwrapped", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      summaryService
    );
    const result = await client.selected({
      firstId: "select-first",
      secondId: "select-second",
    });
    expect(["first", "second"]).toContain(result.tag);
    expect(result.summary).toEqual({
      name: `User select-${result.tag}`,
      orderCount: 1,
    });
  });
  it("waits for journaled cleanup after interrupting a task", async () => {
    const client = genClients.client(
      genClients.connect({ url: env.baseUrl() }),
      coordinationService
    );
    await client.interruptWithCleanup("interrupted-user");
    expect(
      vi
        .mocked(recordAudit)
        .mock.calls.filter(
          ([event, userId]) =>
            event === "cleanup" && userId === "interrupted-user"
        )
    ).toHaveLength(1);
  });
});
