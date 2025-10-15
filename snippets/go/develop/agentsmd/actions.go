package develop

import (
	"fmt"
	"time"

	restate "github.com/restatedev/sdk-go"
)

type Actions struct{}

func (Actions) StateOperations(ctx restate.ObjectContext, greeting string) error {
	// <start_state>
	// Get state keys
	stateKeys, err := restate.Keys(ctx)
	if err != nil {
		return err
	}
	_ = stateKeys

	// Get state
	myString := "my-default"
	if s, err := restate.Get[*string](ctx, "my-string-key"); err != nil {
		return err
	} else if s != nil {
		myString = *s
	}

	count, err := restate.Get[int](ctx, "count")
	if err != nil {
		return err
	}

	// Set state
	restate.Set(ctx, "my-key", "my-new-value")
	restate.Set(ctx, "count", count+1)

	// Clear state
	restate.Clear(ctx, "my-key")
	restate.ClearAll(ctx)
	// <end_state>

	_ = myString
	return nil
}

func (Actions) ServiceCommunication(ctx restate.Context, greeting string) error {
	request := "Hi"
	objectKey := "object-key"
	workflowId := "wf-id"

	// <start_service_calls>
	// Call a Service
	svcResponse, err := restate.Service[string](ctx, "MyService", "MyHandler").
		Request(request)
	if err != nil {
		return err
	}

	// Call a Virtual Object
	objResponse, err := restate.Object[string](ctx, "MyObject", objectKey, "MyHandler").
		Request(request)
	if err != nil {
		return err
	}

	// Call a Workflow
	wfResponse, err := restate.Workflow[string](ctx, "MyWorkflow", workflowId, "Run").
		Request(request)
	if err != nil {
		return err
	}
	// <end_service_calls>

	_ = svcResponse
	_ = objResponse
	_ = wfResponse
	return nil
}

func (Actions) OneWayMessages(ctx restate.Context, greeting string) error {
	request := "Hi"
	objectKey := "object-key"
	workflowId := "wf-id"

	// <start_sending_messages>
	// Send to service
	restate.ServiceSend(ctx, "MyService", "MyHandler").Send(request)

	// Send to virtual object
	restate.ObjectSend(ctx, "MyObject", objectKey, "MyHandler").Send(request)

	// Send to workflow
	restate.WorkflowSend(ctx, "MyWorkflow", workflowId, "Run").Send(request)
	// <end_sending_messages>

	return nil
}

func (Actions) DelayedMessages(ctx restate.Context, greeting string) error {
	request := "Hi"

	// <start_delayed_messages>
	restate.ServiceSend(ctx, "MyService", "MyHandler").Send(request, restate.WithDelay(5*time.Hour))
	// <end_delayed_messages>

	return nil
}

func (Actions) DurableSteps(ctx restate.Context, greeting string) error {
	// <start_durable_steps>
	// Wrap non-deterministic code in restate.Run
	result, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return callExternalAPI(), nil
	})
	if err != nil {
		return err
	}
	// <end_durable_steps>

	_ = result
	return nil
}

func (Actions) DurableTimers(ctx restate.Context, greeting string) error {
	// <start_durable_timers>
	// Sleep
	err := restate.Sleep(ctx, 30*time.Second)
	if err != nil {
		return err
	}

	// Schedule delayed call (different from sleep + send)
	restate.ServiceSend(ctx, "MyService", "MyHandler").
		Send("Hi", restate.WithDelay(5*time.Hour))
	// <end_durable_timers>

	return nil
}

func (Actions) Awakeables(ctx restate.Context, greeting string) error {
	name := "Pete"

	// <start_awakeables>
	// Create awakeable
	awakeable := restate.Awakeable[string](ctx)
	awakeableId := awakeable.Id()

	// Send ID to external system
	if _, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return requestHumanReview(name, awakeableId), nil
	}); err != nil {
		return err
	}

	// Wait for result
	review, err := awakeable.Result()
	if err != nil {
		return err
	}

	// Resolve from another handler
	restate.ResolveAwakeable(ctx, awakeableId, "Looks good!")

	// Reject from another handler
	restate.RejectAwakeable(ctx, awakeableId, fmt.Errorf("Cannot be reviewed"))
	// <end_awakeables>

	_ = review
	return nil
}

func (Actions) WorkflowPromises(ctx restate.WorkflowContext, greeting string) error {
	// <start_workflow_promises>
	// Wait for promise
	promise := restate.Promise[string](ctx, "review")
	review, err := promise.Result()
	if err != nil {
		return err
	}

	// Resolve promise from another handler
	err = restate.Promise[string](ctx, "review").Resolve(review)
	if err != nil {
		return err
	}
	// <end_workflow_promises>

	_ = review
	return nil
}

func (Actions) InvocationManagement(ctx restate.Context, greeting string) error {
	// <start_cancel>
	invocationId := restate.
		ServiceSend(ctx, "MyService", "MyHandler").
		// Optional: send attaching idempotency key
		Send("Hi", restate.WithIdempotencyKey("my-idempotency-key")).
		GetInvocationId()

	// Later re-attach to the request
	response, err := restate.AttachInvocation[string](ctx, invocationId).Response()
	if err != nil {
		return err
	}

	// I don't need this invocation anymore, let me just cancel it
	restate.CancelInvocation(ctx, invocationId)
	// <end_cancel>

	_ = response
	return nil
}

// Helper functions
func callExternalAPI() string {
	return "external result"
}

func requestHumanReview(name, awakeableId string) string {
	// External review logic
	return "review-id"
}
