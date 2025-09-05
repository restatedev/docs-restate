package develop

import (
	"time"

	restate "github.com/restatedev/sdk-go"
)

type Router struct{}

func (Router) Greet(ctx restate.Context, name string) error {
	// <start_request_response>
	// To call a Service:
	svcResponse, err := restate.Service[string](ctx, "MyService", "MyHandler").
		Request("Hi")
	if err != nil {
		return err
	}

	// To call a Virtual Object:
	objResponse, err := restate.Object[string](ctx, "MyObject", "Mary", "MyHandler").
		Request("Hi")
	if err != nil {
		return err
	}

	// To call a Workflow:
	// `run` handler — can only be called once per workflow ID
	wfResponse, err := restate.Workflow[bool](ctx, "MyWorkflow", "my-workflow-id", "Run").
		Request("Hi")
	if err != nil {
		return err
	}
	// Other handlers can be called anytime within workflow retention
	status, err := restate.Workflow[restate.Void](ctx, "MyWorkflow", "my-workflow-id", "GetStatus").
		Request("Hi again")
	if err != nil {
		return err
	}
	// <end_request_response>

	_ = svcResponse
	_ = objResponse
	_ = wfResponse
	_ = status
	return nil
}

func (Router) Greet2(ctx restate.Context, name string) error {

	// <start_one_way>
	// To message a Service:
	restate.ServiceSend(ctx, "MyService", "MyHandler").Send("Hi")

	// To message a Virtual Object:
	restate.ObjectSend(ctx, "MyObject", "Mary", "MyHandler").Send("Hi")

	// To message a Workflow:
	// `run` handler — can only be called once per workflow ID
	restate.WorkflowSend(ctx, "MyWorkflow", "my-workflow-id", "Run").
		Send("Hi")
	// Other handlers can be called anytime within workflow retention
	restate.WorkflowSend(ctx, "MyWorkflow", "my-workflow-id", "InteractWithWorkflow").
		Send("Hi again")
	// <end_one_way>

	// <start_delayed>
	// To message a Service with a delay:
	restate.ServiceSend(ctx, "MyService", "MyHandler").
		Send("Hi", restate.WithDelay(5*time.Hour))

	// To message a Virtual Object with a delay:
	restate.ObjectSend(ctx, "MyObject", "Mary", "MyHandler").
		Send("Hi", restate.WithDelay(5*time.Hour))

	// To message a Workflow with a delay:
	restate.WorkflowSend(ctx, "MyWorkflow", "my-workflow-id", "Run").
		Send("Hi", restate.WithDelay(5*time.Hour))
	// <end_delayed>

	// <start_ordering>
	restate.ObjectSend(ctx, "MyService", "Mary", "MyHandler").Send("I'm call A")
	restate.ObjectSend(ctx, "MyService", "Mary", "MyHandler").Send("I'm call B")
	// <end_ordering>

	return nil
}

func (Router) Greet3(ctx restate.Context, name string) error {
	// <start_idempotency_key>
	restate.
		ServiceSend(ctx, "MyService", "MyHandler").
		// Send attaching idempotency key
		Send("Hi", restate.WithIdempotencyKey("my-idempotency-key"))
	// <end_idempotency_key>

	// <start_attach>
	// Execute the request and retrieve the invocation id
	invocationId := restate.
		ServiceSend(ctx, "MyService", "MyHandler").
		// Optional: send attaching idempotency key
		Send("Hi", restate.WithIdempotencyKey("my-idempotency-key")).
		GetInvocationId()

	// Later re-attach to the request
	response, err := restate.AttachInvocation[string](ctx, invocationId).Response()
	// <end_attach>

	_ = response
	_ = err
	return nil
}

func (Router) Greet4(ctx restate.Context, name string) error {
	// <start_cancel>
	// Execute the request and retrieve the invocation id
	invocationId := restate.
		ServiceSend(ctx, "MyService", "MyHandler").
		Send("Hi").
		GetInvocationId()

	// I don't need this invocation anymore, let me just cancel it
	restate.CancelInvocation(ctx, invocationId)
	// <end_cancel>

	return nil
}
