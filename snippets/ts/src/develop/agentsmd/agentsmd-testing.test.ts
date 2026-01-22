import { RestateTestEnvironment } from "@restatedev/restate-sdk-testcontainers";
import * as clients from "@restatedev/restate-sdk-clients";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { greeter } from "./greeter-service";

describe("MyService", () => {
  let restateTestEnvironment: RestateTestEnvironment;
  let restateIngress: clients.Ingress;

  beforeAll(async () => {
    restateTestEnvironment = await RestateTestEnvironment.start({
      services: [greeter],
    });
    restateIngress = clients.connect({ url: restateTestEnvironment.baseUrl() });
  }, 20_000);

  afterAll(async () => {
    await restateTestEnvironment?.stop();
  });

  it("Can call methods", async () => {
    const client = restateIngress.objectClient(greeter, "myKey");
    await client.greet("Test!");
  });

  it("Can read/write state", async () => {
    const state = restateTestEnvironment.stateOf(greeter, "myKey");
    await state.set("count", 123);
    expect(await state.get("count")).toBe(123);
  });
});
