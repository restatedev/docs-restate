package main

import (
	"context"
	"fmt"
	"log"
	"time"

	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
)

type MyWorkflow struct {
}

func (MyWorkflow) MyHandler(ctx restate.WorkflowContext, greeting string) (string, error) {
	return fmt.Sprintf("%s!", greeting), nil
}

func main() {
	// <start_options>
	// Specify service options when binding them to an endpoint
	if err := server.NewRestate().
		Bind(
			restate.Reflect(
				MyWorkflow{},
				restate.WithInvocationRetryPolicy(
					restate.WithInitialInterval(time.Second),
					restate.WithMaxInterval(30*time.Second),
					restate.WithMaxAttempts(10),
					restate.PauseOnMaxAttempts()),
				restate.WithInactivityTimeout(15*time.Minute),
				restate.WithAbortTimeout(15*time.Minute),
				restate.WithIdempotencyRetention(3*24*time.Hour),
				restate.WithJournalRetention(7*24*time.Hour),
				restate.WithIngressPrivate(true),
				restate.WithEnableLazyState(true),
				restate.WithWorkflowRetention(10*24*time.Hour), // Only for workflows
			),
		).
		Start(context.Background(), "0.0.0.0:9080"); err != nil {
		log.Fatal(err)
	}
	// <end_options>

	// <start_handleropts>
	// Use ConfigureHandler to customize a handler configuration
	if err := server.NewRestate().
		Bind(
			restate.Reflect(MyWorkflow{}).
				ConfigureHandler("run",
					restate.WithInvocationRetryPolicy(
						restate.WithInitialInterval(time.Second),
						restate.WithMaxInterval(30*time.Second),
						restate.WithMaxAttempts(10),
						restate.PauseOnMaxAttempts()),
					restate.WithInactivityTimeout(15*time.Minute),
					restate.WithAbortTimeout(15*time.Minute),
					restate.WithIdempotencyRetention(3*24*time.Hour),
					restate.WithJournalRetention(7*24*time.Hour),
					restate.WithIngressPrivate(true),
					restate.WithEnableLazyState(true),
					restate.WithWorkflowRetention(10*24*time.Hour), // Only for workflows
				),
		).
		Start(context.Background(), "0.0.0.0:9080"); err != nil {
		log.Fatal(err)
	}
	// <end_handleropts>
}
