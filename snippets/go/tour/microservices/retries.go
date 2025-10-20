package microservices

import (
	"fmt"
	"github.com/google/uuid"
	"time"

	restate "github.com/restatedev/sdk-go"
)

type JournalingResults struct{}

type SubscriptionRequest struct {
	CreditCard    string
	Subscriptions []string
	UserId        string
}

func (JournalingResults) Greet(ctx restate.Context, req SubscriptionRequest) error {
	paymentId := restate.UUID(ctx).String()
	// <start_here>
	result, err := restate.Run(ctx,
		func(ctx restate.RunContext) (string, error) {
			return createRecurringPayment(req.CreditCard, paymentId)
		},
		restate.WithInitialRetryInterval(time.Millisecond*100),
		restate.WithMaxRetryAttempts(3),
		restate.WithName("pay"),
	)
	if err != nil {
		return err
	}
	// <end_here>

	_ = result

	return nil
}

func createRecurringPayment(creditCard, paymentId string) (string, error) {
	return fmt.Sprintf("payRef-%s", uuid.New().String()), nil
}
