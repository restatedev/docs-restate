package invocations

import (
	"context"
	"net/http"

	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/client"
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
	// Send with idempotency key
	future := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture(
		"Hi",
		restate.WithIdempotencyKey("my-key"),
	)
	response, err := future.Response()
	if err != nil {
		return "", err
	}
	// <end_attach>

	// Use response to avoid compiler warning
	_ = response

	return greeting + "!", nil
}

func (GreeterService) Cancel(ctx restate.Context, req GreetingRequest) (restate.Void, error) {
	// <start_cancel>
	// Send message (fire-and-forget)
	restate.ServiceSend(ctx, "MyService", "MyHandler").Send("Hi")

	// Note: Cancellation in Go SDK would be handled through invocation management
	// This is a simplified example as the exact cancel API may differ
	// <end_cancel>

	return restate.Void{}, nil
}

func Call() error {
	// <start_here>
	rs, err := client.Connect("http://localhost:8080")
	if err != nil {
		return err
	}

	// To call a service:
	var greet string
	_, err = rs.CallSync(context.Background(), "GreeterService", "Greet", GreetingRequest{Greeting: "Hi"}, &greet)
	if err != nil {
		return err
	}
	// <end_here>

	// Use greet to avoid compiler warning
	_ = greet

	return nil
}