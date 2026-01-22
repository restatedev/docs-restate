package develop

import (
	"context"
	"fmt"
	"math/rand/v2"
	"time"

	restate "github.com/restatedev/sdk-go"
)

type JournalingResults struct{}

func (JournalingResults) Greet(ctx restate.Context, name string) error {
	// <start_side_effect>
	result, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return doDbRequest()
	})
	if err != nil {
		return err
	}
	// <end_side_effect>

	_ = result

	return nil
}

func (JournalingResults) Greet2(ctx restate.Context, name string) error {
	// <start_side_effect_retry>
	result, err := restate.Run(ctx,
		func(ctx restate.RunContext) (string, error) {
			return doDbRequest()
		},
		// After 10 seconds, give up retrying
		restate.WithMaxRetryDuration(time.Second*10),
		// On the first retry, wait 100 milliseconds before next attempt
		restate.WithInitialRetryInterval(time.Millisecond*100),
		// Grow retry interval with factor 2
		restate.WithRetryIntervalFactor(2.0),
		// Optional: provide a name for the operation to be visible in the
		// observability tools.
		restate.WithName("my_db_request"),
	)
	if err != nil {
		return err
	}
	// <end_side_effect_retry>

	_ = result

	return nil
}

type UserData struct {
}

type OrderHistory struct {
}

func (JournalingResults) PromiseCombinators(ctx restate.Context, name string) (string, error) {
	// <start_parallel>
	call1 := restate.RunAsync(ctx, func(ctx restate.RunContext) (UserData, error) {
		return fetchUserData(123)
	})
	call2 := restate.RunAsync(ctx, func(ctx restate.RunContext) (OrderHistory, error) {
		return fetchOrderHistory(123)
	})
	call3 := restate.Service[int](ctx, "AnalyticsService", "CalculateMetrics").RequestFuture(123)

	user, _ := call1.Result()
	orders, _ := call2.Result()
	metrics, _ := call3.Response()
	// <end_parallel>

	_ = user
	_ = orders
	_ = metrics

	// <start_race>
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
	// <end_race>

	// <start_uuid>
	uuid := restate.UUID(ctx)
	// <end_uuid>

	_ = uuid

	// <start_random_nb>
	randomInt := restate.Rand(ctx).Uint64()
	randomFloat := restate.Rand(ctx).Float64()
	mathRandV2 := rand.New(restate.RandSource(ctx))
	// <end_random_nb>

	_ = randomInt
	_ = randomFloat
	_ = mathRandV2

	return "", nil
}

func fetchOrderHistory(i int) (OrderHistory, error) {
	return OrderHistory{}, nil
}

func fetchUserData(i int) (UserData, error) {
	return UserData{}, nil
}

func (JournalingResults) SelectCombinators(ctx restate.Context, name string) (string, error) {
	// <start_all>
	callFuture1 := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi")
	callFuture2 := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi again")

	// Collect all results
	var subResults []string
	for fut, err := range restate.Wait(ctx, callFuture1, callFuture2) {
		if err != nil {
			return "", err
		}
		response, err := fut.(restate.ResponseFuture[string]).Response()
		if err != nil {
			return "", err
		}
		subResults = append(subResults, response)
	}
	// <end_all>

	return fmt.Sprintf("All subtasks completed with results: %v", subResults), nil
}

func (JournalingResults) ContextPropagation(ctx restate.Context, name string) error {
	// <start_wrap_context>
	// Wrap an external context (like OpenTelemetry) into the Restate context
	externalCtx := context.Background()
	ctx = restate.WrapContext(ctx, externalCtx)

	// Use the wrapped context in Run blocks
	_, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		// The external context is now available here
		return callExternalAPI(ctx)
	})
	// <end_wrap_context>
	if err != nil {
		return err
	}

	return nil
}

func (JournalingResults) CustomValuePropagation(ctx restate.Context, name string) error {
	// <start_with_value>
	// Propagate custom values through the context
	type contextKey string
	const userIDKey contextKey = "userID"

	// Set a value in the context
	ctx = restate.WithValue(ctx, userIDKey, "user-123")

	// The value is available in Run blocks
	_, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		// Extract the value using standard context APIs
		userID := ctx.Value(userIDKey).(string)
		return processWithUserID(userID)
	})
	// <end_with_value>
	if err != nil {
		return err
	}

	return nil
}

func callExternalAPI(ctx context.Context) (string, error) {
	return "", nil
}

func processWithUserID(userID string) (string, error) {
	return "", nil
}

func doDbRequest() (string, error) {
	return "", nil
}
