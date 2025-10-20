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

	fut, err := restate.WaitFirst(ctx, sleepFuture, callFuture)
	if err != nil {
		return "", err
	}
	switch fut {
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
