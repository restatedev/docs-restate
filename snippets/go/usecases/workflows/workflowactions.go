package workflows

import (
	"time"

	restate "github.com/restatedev/sdk-go"
)

type OrderDetails struct {
	ID     string `json:"id"`
	Amount int    `json:"amount"`
}

type OrderStatus struct {
	Payment *string       `json:"payment"`
	Order   *OrderDetails `json:"order"`
}

type ApprovalWorkflow struct{}

func (ApprovalWorkflow) Run(ctx restate.WorkflowContext, user User) (string, error) {
	order := OrderDetails{ID: "order123", Amount: 1500}

	// <start_state>
	// Store intermediate results
	restate.Set(ctx, "payment-status", "completed")
	restate.Set(ctx, "order-details", order)
	// <end_state>

	// <start_approval>
	// Wait for external approval
	approval, err := restate.Promise[bool](ctx, "manager-approval").Result()
	// <end_approval>
	if err != nil {
		return "nil", err
	}

	_ = approval

	// <start_timers>
	// Wait for user action with timeout
	userResponse := restate.Promise[string](ctx, "user-response")
	timeout := restate.After(ctx, 24*time.Hour)

	selector := restate.Select(ctx, userResponse, timeout)
	switch selector.Select() {
	case userResponse:
		return userResponse.Result()
	case timeout:
		return "timed out", nil
	}
	// <end_timers>

	return "result", nil
}

// <start_approve>
// External system resolves the promise
func (ApprovalWorkflow) Approve(ctx restate.WorkflowSharedContext, decision bool) error {
	return restate.Promise[bool](ctx, "manager-approval").Resolve(decision)
}

// <end_approve>

type OrderWorkflow struct{}

// <start_state_get>
// Query from external handler
func (OrderWorkflow) GetOrderDetails(ctx restate.WorkflowSharedContext) (OrderDetails, error) {
	return restate.Get[OrderDetails](ctx, "order-details")
}

// <end_state_get>
