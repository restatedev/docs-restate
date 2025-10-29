package main

import (
	"fmt"
	"time"

	restate "github.com/restatedev/sdk-go"
)

type PaymentResult struct{}

type StockResult struct {
	Item    string `json:"item"`
	InStock bool   `json:"in_stock"`
}

func StartPayment(order Order, awakeableID string) (restate.Void, error) {
	// Simulate starting payment with awakeable ID
	return restate.Void{}, nil
}

func ProcessItem(item Item) (restate.Void, error) {
	// Simulate item processing
	return restate.Void{}, nil
}

type MyService struct{}

func (MyService) Process(ctx restate.Context, order Order) error {
	req := "item-123"
	ticket := order

	// <start_communication>
	// Request-response: Wait for result
	result, err := restate.Service[StockResult](ctx, "PaymentService", "Charge").Request(req)
	if err != nil {
		return err
	}
	_ = result

	// Fire-and-forget: Guaranteed delivery without waiting
	restate.ServiceSend(ctx, "EmailService", "EmailTicket").Send(ticket)

	// Delayed execution: Schedule for later
	restate.ServiceSend(ctx, "EmailService", "SendReminder").Send(ticket, restate.WithDelay(7*24*time.Hour))
	// <end_communication>

	// <start_awakeables>
	// Wait for external payment confirmation
	confirmation := restate.Awakeable[PaymentResult](ctx)
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return StartPayment(order, confirmation.Id())
	})
	if err != nil {
		return err
	}

	_, err = confirmation.Result()
	if err != nil {
		return err
	}
	// <end_awakeables>

	// <start_parallel>
	// Process all items in parallel
	var itemFutures []restate.Future
	for _, item := range order.Items {
		itemFutures = append(itemFutures,
			restate.RunAsync(ctx, func(ctx restate.RunContext) (restate.Void, error) {
				return ProcessItem(item)
			}))
	}

	for fut, err := range restate.Wait(ctx, itemFutures...) {
		if err != nil {
			return err
		}
		_, err := fut.(restate.RunAsyncFuture[string]).Result()
		if err != nil {
			return err
		}
	}
	// <end_parallel>

	return nil
}

type PaymentService struct{}

func (PaymentService) Charge(ctx restate.Context, item string) (StockResult, error) {
	// Simulate stock check
	return StockResult{Item: item, InStock: true}, nil
}

type EmailService struct{}

func (EmailService) EmailTicket(ctx restate.Context, order Order) error {
	// Simulate sending email
	fmt.Printf("Sending confirmation for order %s\n", order.ID)
	return nil
}

func (EmailService) SendReminder(ctx restate.Context, order Order) error {
	// Simulate sending reminder
	fmt.Printf("Sending reminder for order %s\n", order.ID)
	return nil
}
