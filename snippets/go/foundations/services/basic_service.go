package main

import (
	restate "github.com/restatedev/sdk-go"
)

type SubscriptionRequest struct {
	UserId        string   `json:"userId"`
	CreditCard    string   `json:"creditCard"`
	Subscriptions []string `json:"subscriptions"`
}

func createRecurringPayment(creditCard string, paymentId string) (string, error) {
	return "", nil
}

func createSubscription(userId string, subscription string, payRef string) (string, error) {
	return "", nil
}

// <start_here>
type SubscriptionService struct{}

func (SubscriptionService) Add(ctx restate.Context, req SubscriptionRequest) error {
	paymentId := restate.UUID(ctx).String()

	payRef, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return createRecurringPayment(req.CreditCard, paymentId)
	})
	if err != nil {
		return err
	}

	for _, subscription := range req.Subscriptions {
		_, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
			return createSubscription(req.UserId, subscription, payRef)
		})
		if err != nil {
			return err
		}
	}

	return nil
}

// <end_here>
