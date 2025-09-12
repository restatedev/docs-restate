package main

import (
	restate "github.com/restatedev/sdk-go"
)

type Order struct {
	ID         string `json:"id"`
	Items      []Item `json:"items"`
	CreditCard string `json:"credit_card"`
}

type Item struct {
	ID       string `json:"id"`
	Quantity int    `json:"quantity"`
}

type OrderResult struct {
	Success   bool   `json:"success"`
	PaymentID string `json:"payment_id"`
}

func ChargePayment(creditCard, paymentID string) (restate.Void, error) {
	// Simulate payment processing
	return restate.Void{}, nil
}

func ReserveInventory(itemID string, quantity int) (restate.Void, error) {
	// Simulate payment processing
	return restate.Void{}, nil
}

// <start_here>
type OrderService struct{}

func (OrderService) Process(ctx restate.Context, order Order) (OrderResult, error) {
	// Each step is automatically durable and resumable
	paymentID := restate.Rand(ctx).UUID().String()

	_, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return ChargePayment(order.CreditCard, paymentID)
	})
	if err != nil {
		return OrderResult{}, err
	}

	for _, item := range order.Items {
		_, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
			return ReserveInventory(item.ID, item.Quantity)
		})
		if err != nil {
			return OrderResult{}, err
		}
	}

	return OrderResult{Success: true, PaymentID: paymentID}, nil
}

// <end_here>
