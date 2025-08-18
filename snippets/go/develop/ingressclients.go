package develop

import (
	"context"
	"time"

	restate "github.com/restatedev/sdk-go"
	restateingress "github.com/restatedev/sdk-go/ingress"
)

type IngressClient struct{}

func (c *IngressClient) myGoHandler() {
	var input MyInput
	input.Name = "Hi"

	// <start_rpc>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// To call a service
	svcResponse, err := restateingress.Service[*MyInput, *MyOutput](
		restateClient, "MyService", "MyHandler").
		Request(context.Background(), &input)

	// To call a virtual object
	objResponse, err := restateingress.Object[*MyInput, *MyOutput](
		restateClient, "MyObject", "Mary", "MyHandler").
		Request(context.Background(), &input)

	// To Run a workflow
	wfResponse, err := restateingress.Workflow[*MyInput, *MyOutput](
		restateClient, "MyWorkflow", "Mary", "Run").
		Request(context.Background(), &input)

	// To interact with a workflow
	status, err := restateingress.Object[*MyInput, *MyOutput](
		restateClient, "MyWorkflow", "Mary", "interactWithWorkflow").
		Request(context.Background(), &input)
	// <end_rpc>

	_ = svcResponse
	_ = objResponse
	_ = wfResponse
	_ = status
	_ = err
}

func (c *IngressClient) myOneWayCallHandler() {
	var input MyInput
	input.Name = "Hi"

	// <start_one_way_call>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// To message a service
	restateingress.ServiceSend[*MyInput](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), &input)

	// To message a virtual object
	restateingress.ObjectSend[*MyInput](
		restateClient, "MyObject", "Mary", "MyHandler").
		Send(context.Background(), &input)

	// To Run a workflow without waiting for the result
	restateingress.WorkflowSend[*MyInput](
		restateClient, "MyWorkflow", "Mary", "Run").
		Send(context.Background(), &input)
	// <end_one_way_call>
}

func (c *IngressClient) myDelayedOneWayCallHandler() {
	var input MyInput
	input.Name = "Hi"

	// <start_delayed_call>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// To message a service with a delay
	restateingress.ServiceSend[*MyInput](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), &input, restate.WithDelay(5*24*time.Hour))

	// To message a virtual object with a delay
	restateingress.ObjectSend[*MyInput](
		restateClient, "MyObject", "Mary", "MyHandler").
		Send(context.Background(), &input, restate.WithDelay(5*24*time.Hour))

	// To Run a workflow without waiting for the result
	restateingress.WorkflowSend[*MyInput](
		restateClient, "MyWorkflow", "Mary", "Run").
		Send(context.Background(), &input, restate.WithDelay(5*24*time.Hour))
	// <end_delayed_call>
}

func (c *IngressClient) idempotentInvoke() {
	var input MyInput
	input.Name = "Hi"

	// <start_service_idempotent>
	restateClient := restateingress.NewClient("http://localhost:8080")

	restateingress.ServiceSend[*MyInput](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), &input, restate.WithIdempotencyKey("abc"))
	// <end_service_idempotent>
}

func (c *IngressClient) attach() {
	var input MyInput
	input.Name = "Hi"

	// <start_service_attach>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// The call to which we want to attach later
	handle := restateingress.ServiceSend[*MyInput](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), &input, restate.WithIdempotencyKey("my-idempotency-key"))

	// ... do something else ...

	// ---------------------------------
	// OPTION 1: With the invocation Id
	invocationId := handle.Id

	// - Attach
	result1, err := restateingress.AttachInvocation[*MyOutput](
		restateClient, invocationId).
		Attach(context.Background())

	// - Peek
	output, err := restateingress.AttachInvocation[*MyOutput](
		restateClient, invocationId).
		Output(context.Background())

	// ---------------------------------
	// OPTION 3: With the idempotency key
	result2, err := restateingress.AttachService[*MyOutput](
		restateClient, "MyService", "MyHandler", "my-idempotency-key").
		Attach(context.Background())
	// <end_service_attach>

	_ = result1
	_ = output
	_ = result2
	_ = err
}

func (c *IngressClient) workflowAttach() {
	var input MyInput
	input.Name = "Hi"

	// <start_workflow_attach>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// The workflow to which we want to attach later
	wfHandle := restateingress.WorkflowSend[*MyInput](
		restateClient, "MyWorkflow", "Mary", "Run").
		Send(context.Background(), &input)

	// ... do something else ...

	// ---------------------------------
	// OPTION 1: With the handle returned by the workflow submission
	// - Attach
	result, err := restateingress.AttachInvocation[*MyOutput](
		restateClient, wfHandle.Id).
		Attach(context.Background())

	// - Peek
	output, err := restateingress.AttachInvocation[*MyOutput](
		restateClient, wfHandle.Id).
		Output(context.Background())

	// ---------------------------------
	// OPTION 2: With the workflow ID
	wfHandle2, err := restateingress.AttachWorkflow[*MyOutput](
		restateClient, "MyWorkflow", "wf-id").
		Attach(context.Background())
	// <end_workflow_attach>

	_ = result
	_ = output
	_ = wfHandle2
	_ = err
}

// Mock data structures
type MyInput struct {
	Name string
}

type MyOutput struct {
	Greeting string
}
