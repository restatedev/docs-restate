package main

import (
	restate "github.com/restatedev/sdk-go"
)

// Type definitions
type Order struct {
	UserID string
	Amount float64
	ID     string
}

type Payment struct {
	ID     string
	Amount float64
}

// Service stubs
var notificationService = struct {
	Notify func(userID, message string) error
}{
	Notify: func(userID, message string) error {
		// Simulate notification
		return nil
	},
}

// Function stubs
func processPayment(id string, order Order) (Payment, error) {
	// Simulate payment processing
	return Payment{
		ID:     "payment_" + order.ID,
		Amount: order.Amount,
	}, nil
}

func refundPayment(id string) error {
	// Simulate refund processing
	return nil
}

type OrderService struct {
}

// <start_here>
func (OrderService) processOrder(ctx restate.ObjectContext, order Order) error {
	// If cancellation happened right before this line, this still executes
	restate.Set(ctx, "status", "processing")

	// If cancellation happened right before this line, this still executes
	paymentId := restate.Rand(ctx).UUID().String()

	// If cancelled right before this line, Run won't execute
	// If cancelled during run block execution,
	// then a terminal error gets returned here once execution finishes
	_, err := restate.Run(ctx, func(ctx restate.RunContext) (Payment, error) {
		return processPayment(paymentId, order)
	})
	if err != nil {
		if restate.IsTerminalError(err) {
			// Cancellation detected - run compensation
			_, _ = restate.Run(ctx, func(ctx restate.RunContext) (any, error) {
				return nil, refundPayment(paymentId)
			})
		}
		return err
	}

	// If cancellation happened right before this line, this still executes
	restate.ServiceSend(ctx, "NotificationService", "Notify").
		Send("Payment processed")

	return nil
}

// <end_here>
