package develop

import (
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
	// <end_race>

	// <start_uuid>
	uuid := restate.Rand(ctx).UUID()
	// <end_uuid>

	_ = uuid

	// <start_random_nb>
	randomInt := restate.Rand(ctx).Uint64()
	randomFloat := restate.Rand(ctx).Float64()
	randomSource := rand.New(restate.Rand(ctx).Source())
	// <end_random_nb>

	_ = randomInt
	_ = randomFloat
	_ = randomSource

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

	selector := restate.Select(ctx, callFuture1, callFuture2)

	// Collect all results
	var subResults []string
	for selector.Remaining() {
		response, err := selector.Select().(restate.ResponseFuture[string]).Response()
		if err != nil {
			return "", err
		}
		subResults = append(subResults, response)
	}
	// <end_all>

	return fmt.Sprintf("All subtasks completed with results: %v", subResults), nil
}

func doDbRequest() (string, error) {
	return "", nil
}
