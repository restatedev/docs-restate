package develop

import (
	"context"
	"time"

	restate "github.com/restatedev/sdk-go"
	restateingress "github.com/restatedev/sdk-go/ingress"
)

type Clients struct{}

func (Clients) ClientExamples() {
	// <start_here>
	restateClient := restateingress.NewClient("http://localhost:8080")

	// Request-response
	result, err := restateingress.Service[string, string](
		restateClient, "MyService", "MyHandler").
		Request(context.Background(), "Hi")
	if err != nil {
		// handle error
	}

	// One-way
	restateingress.ServiceSend[string](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), "Hi")

	// Delayed
	restateingress.ServiceSend[string](
		restateClient, "MyService", "MyHandler").
		Send(context.Background(), "Hi", restate.WithDelay(1*time.Hour))
	// <end_here>

	_ = result
}
