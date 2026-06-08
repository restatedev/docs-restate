async function main() {
  // <start_here>
  // Request-response
  const response = await fetch("http://localhost:8080/restate/call/my-agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How are you?" }),
  });
  const result = await response.json();

  // Fire-and-forget: use the /restate/send/... path
  await fetch("http://localhost:8080/restate/send/my-agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How are you?" }),
  });
  // <end_here>

  // <start_idempotency>
  await fetch("http://localhost:8080/restate/send/my-agent/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "idempotency-key": "abc-123",
    },
    body: JSON.stringify({ message: "How are you?" }),
  });
  // <end_idempotency>
}

async function main2() {
  // <start_attach>
  // start the invocation
  const handle = await fetch("http://localhost:8080/restate/send/agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("How are you?"),
  });

  // retrieve the invocationId
  const { invocationId, status } = await handle.json();

  // retrieve the result by attaching to the invocation id
  const result = await fetch(
    `http://localhost:8080/restate/attach/${invocationId}`,
    { method: "GET" }
  );
  await result.json();
  // <end_attach>
}

async function main3() {
  // <start_attach_idem>
  // attach via the idempotency key of an earlier invocation
  const idempotencyKey = "abc-123";
  const result = await fetch(`http://localhost:8080/restate/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "idempotency",
      service: "agent",
      handler: "run",
      idempotencyKey,
    }),
  });
  await result.json();
  // <end_attach_idem>
}
