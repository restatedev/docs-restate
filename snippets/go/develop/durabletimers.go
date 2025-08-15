package develop

import (
	"fmt"
	"time"

	restate "github.com/restatedev/sdk-go"
)

type DurableTimers struct{}

func (DurableTimers) Greet(ctx restate.Context, name string) (string, error) {
	// <start_here>
	if err := restate.Sleep(ctx, 10*time.Second); err != nil {
		return "", err
	}
	// <end_here>

	// <start_timer>
	sleepFuture := restate.After(ctx, 30*time.Second)
	callFuture := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi")

	selector := restate.Select(ctx, sleepFuture, callFuture)
	switch selector.Select() {
	case sleepFuture:
		if err := sleepFuture.Done(); err != nil {
			return "", err
		}
		return "sleep won", nil
	case callFuture:
		result, err := callFuture.Response()
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("call won with result: %s", result), nil
	}
	// <end_timer>

	return "", nil
}
