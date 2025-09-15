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
	item := "item-123"

	// <start_communication>
	// Request-response: Wait for result
	result, err := restate.Service[StockResult](ctx, "InventoryService", "checkStock").Request(item)
	if err != nil {
		return err
	}
	_ = result

	// Fire-and-forget: Guaranteed delivery without waiting
	restate.ServiceSend(ctx, "EmailService", "sendConfirmation").Send(order)

	// Delayed execution: Schedule for later
	restate.ServiceSend(ctx, "ReminderService", "sendReminder").Send(order, restate.WithDelay(7*24*time.Hour))
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
	var itemFutures []restate.Selectable
	for _, item := range order.Items {
		itemFutures = append(itemFutures,
			restate.RunAsync(ctx, func(ctx restate.RunContext) (restate.Void, error) {
				return ProcessItem(item)
			}))
	}

	selector := restate.Select(ctx, itemFutures...)

	for selector.Remaining() {
		_, err := selector.Select().(restate.RunAsyncFuture[string]).Result()
		if err != nil {
			return err
		}
	}
	// <end_parallel>

	return nil
}

type InventoryService struct{}

func (InventoryService) CheckStock(ctx restate.Context, item string) (StockResult, error) {
	// Simulate stock check
	return StockResult{Item: item, InStock: true}, nil
}

type EmailService struct{}

func (EmailService) SendConfirmation(ctx restate.Context, order Order) error {
	// Simulate sending email
	fmt.Printf("Sending confirmation for order %s\n", order.ID)
	return nil
}

type ReminderService struct{}

func (ReminderService) SendReminder(ctx restate.Context, order Order) error {
	// Simulate sending reminder
	fmt.Printf("Sending reminder for order %s\n", order.ID)
	return nil
}
