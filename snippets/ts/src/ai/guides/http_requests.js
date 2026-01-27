async function main() {
  // <start_here>
  // Request-response
  const response = await fetch("http://localhost:8080/my-agent/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How are you?" }),
  });
  const result = await response.json();

  // Fire-and-forget: add /send to the URL
  await fetch("http://localhost:8080/my-agent/run/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "How are you?" }),
  });
  // <end_here>

  // <start_idempotency>
  await fetch("http://localhost:8080/my-agent/run/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "idempotency-key": "abc-123",
    },
    body: JSON.stringify("How are you?"),
  });
  // <end_idempotency>
}

async function main2() {
  // <start_attach>
  // start the invocation
  const handle = await fetch("http://localhost:8080/agent/run/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("How are you?"),
  });

  // retrieve the invocationId
  const { invocationId, status } = await handle.json();

  // retrieve the result
  const result = await fetch(
    `http://localhost:8080/restate/invocation/${invocationId}/attach`,
    { method: "GET" }
  );
  await result.json();
  // <end_attach>
}

async function main3() {
  // <start_attach_idem>
  // start the invocation with idempotency key
  const idempotencyKey = "abc-123";
  const result = await fetch(
    `http://localhost:8080/restate/invocation/agent/run/${idempotencyKey}/attach`,
    { method: "GET" }
  );
  await result.json();
  // <end_attach_idem>
}
