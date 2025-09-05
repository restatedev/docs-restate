package invocations

import (
	"context"
	restateingress "github.com/restatedev/sdk-go/ingress"

	restate "github.com/restatedev/sdk-go"
)

type MyService struct{}

func (MyService) MyHandler(ctx restate.Context, greeting string) (string, error) {
	return greeting + "!", nil
}

type GreeterService struct{}

type GreetingRequest struct {
	Greeting string `json:"greeting"`
}

func (GreeterService) Greet(ctx restate.Context, req GreetingRequest) (string, error) {
	greeting := req.Greeting

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

	if err != nil {

	}

	// Use response to avoid compiler warning
	_ = response

	return greeting + "!", nil
}

func (GreeterService) Cancel(ctx restate.Context, req GreetingRequest) (restate.Void, error) {
	// <start_cancel>
	// Execute the request and retrieve the invocation id
	invocationId := restate.
		ServiceSend(ctx, "MyService", "MyHandler").
		Send("Hi").
		GetInvocationId()

	// I don't need this invocation anymore, let me just cancel it
	restate.CancelInvocation(ctx, invocationId)
	// <end_cancel>

	return restate.Void{}, nil
}

func Call() error {
	var input MyInput
	input.Name = "Hi"
	// <start_here>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// To call a service
	response, err := restateingress.Service[*MyInput, *MyOutput](
		restateClient, "MyService", "MyHandler").
		Request(context.Background(), &input)
	if err != nil {
		return err
	}
	// <end_here>

	// Use greet to avoid compiler warning
	_ = response

	return nil
}

// Mock data structures
type MyInput struct {
	Name string
}

type MyOutput struct {
	Greeting string
}
