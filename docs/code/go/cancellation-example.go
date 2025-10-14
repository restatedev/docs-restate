package example

import (
	restate "github.com/restatedev/sdk-go"
)

func processOrder(ctx restate.Context, order Order) error {
	// This executes - not an await point
	restate.Set(ctx, "status", "processing")

	// If cancelled before this await, Run won't execute
	// If cancelled during execution, then gets thrown after the execution
	payment, err := restate.Run(ctx, func(ctx restate.RunContext) (Payment, error) {
		return processPayment(order)
	})
	if err != nil {
		if restate.IsTerminalError(err) {
			// Cancellation detected - run compensation
			_, _ = restate.Run(ctx, func(ctx restate.RunContext) (any, error) {
				return nil, refundPayment(order)
			})
		}
		return err
	}

	// These one-way calls execute even if cancellation happened right before
	restate.Send(ctx, notificationService.Notify, order.UserID, "Payment processed")

	return nil
}
