package main

import (
	"context"
	"fmt"
	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"log"
	"time"
)

type MyWorkflow struct {
}

// <start_handleropts>
func (MyWorkflow) MyHandler(ctx restate.WorkflowContext, greeting string) (string, error) {
	return fmt.Sprintf("%s!", greeting), nil
}

// <end_handleropts>

func main() {
	// <start_options>
	// Specify service options when binding them to an endpoint
	if err := server.NewRestate().
		Bind(
			restate.Reflect(
				MyWorkflow{},
				restate.WithInactivityTimeout(15*time.Minute),
				restate.WithAbortTimeout(15*time.Minute),
				restate.WithIdempotencyRetention(3*24*time.Hour),
				restate.WithJournalRetention(7*24*time.Hour),
				restate.WithIngressPrivate(true),
				restate.WithEnableLazyState(true),
			),
		).
		Start(context.Background(), "0.0.0.0:9080"); err != nil {
		log.Fatal(err)
	}
	// <end_options>
}
