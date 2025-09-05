package actions

import (
	"time"

	restate "github.com/restatedev/sdk-go"
)

// Type definitions for examples
type UserProfile struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ShoppingCart struct{}

type PaymentResult struct {
	Success       bool   `json:"success"`
	TransactionId string `json:"transactionId"`
}

type InventoryResult struct {
	Available bool `json:"available"`
	Quantity  int  `json:"quantity"`
}

// Mock external functions
func fetchData(url string) (map[string]interface{}, error) {
	return map[string]interface{}{}, nil
}

func updateUserDatabase(id string, data interface{}) interface{} {
	return data
}

// Mock services for examples
type ValidationService struct{}

func (ValidationService) ValidateOrder(ctx restate.Context, order interface{}) (map[string]bool, error) {
	return map[string]bool{"valid": true}, nil
}

type NotificationService struct{}

func (NotificationService) SendEmail(ctx restate.Context, req map[string]string) (restate.Void, error) {
	return restate.Void{}, nil
}

type AnalyticsService struct{}

func (AnalyticsService) RecordEvent(ctx restate.Context, event interface{}) (restate.Void, error) {
	return restate.Void{}, nil
}

type ShoppingCartObject struct{}

func (ShoppingCartObject) EmptyExpiredCart(ctx restate.ObjectContext) (restate.Void, error) {
	return restate.Void{}, nil
}

type ReminderService struct{}

func (ReminderService) SendReminder(ctx restate.Context, req map[string]string) (restate.Void, error) {
	return restate.Void{}, nil
}

type UserAccount struct{}

func (UserAccount) GetProfile(ctx restate.ObjectContext) (UserProfile, error) {
	return UserProfile{Name: "John", Email: "john@example.com"}, nil
}

type Order struct{}

type OrderWorkflow struct{}

func (OrderWorkflow) Run(ctx restate.WorkflowContext, order Order) (restate.Void, error) {
	return restate.Void{}, nil
}

func (OrderWorkflow) GetStatus(ctx restate.WorkflowSharedContext) (string, error) {
	return "pending", nil
}

// Example service that demonstrates all actions
type ActionsExample struct{}

func (ActionsExample) DurableStepsExample(ctx restate.Context, userId string) (restate.Void, error) {
	// <start_durable_steps>
	// External API call
	apiResult, err := restate.Run(ctx, func(ctx restate.RunContext) (map[string]interface{}, error) {
		return fetchData("https://api.example.com/data")
	})
	if err != nil {
		return restate.Void{}, err
	}

	// Database operation
	dbResult, err := restate.Run(ctx, func(ctx restate.RunContext) (interface{}, error) {
		return updateUserDatabase(userId, map[string]string{"name": "John"}), nil
	})
	if err != nil {
		return restate.Void{}, err
	}

	// Idempotency key generation
	id := restate.Rand(ctx).UUID().String()
	// <end_durable_steps>

	// Use results to avoid compiler warnings
	_ = apiResult
	_ = dbResult
	_ = id

	return restate.Void{}, nil
}

func (ActionsExample) ServiceCallsExample(ctx restate.Context, req map[string]interface{}) error {
	userId := req["userId"].(string)
	orderId := req["orderId"].(string)
	order := req["order"].(Order)

	// <start_service_calls>
	// Call another service
	validation, err := restate.Service[map[string]bool](ctx, "ValidationService", "ValidateOrder").Request(order)
	if err != nil {
		return err
	}

	// Call Virtual Object function
	profile, err := restate.Object[UserProfile](ctx, "UserAccount", userId, "GetProfile").Request(restate.Void{})
	if err != nil {
		return err
	}

	// Submit Workflow
	_, err = restate.Workflow[restate.Void](ctx, "OrderWorkflow", orderId, "Run").Request(order)
	if err != nil {
		return err
	}
	// <end_service_calls>

	// Use results to avoid compiler warnings
	_ = validation
	_ = profile

	return nil
}

func (ActionsExample) SendingMessagesExample(ctx restate.Context, userId string) error {
	// <start_sending_messages>
	// Fire-and-forget notification
	restate.ServiceSend(ctx, "NotificationService", "SendEmail").Send(map[string]string{
		"userId":  userId,
		"message": "Welcome!",
	})

	// Background analytics
	restate.ServiceSend(ctx, "AnalyticsService", "RecordEvent").Send(map[string]interface{}{
		"kind":   "user_signup",
		"userId": userId,
	})

	// Cleanup task
	restate.ObjectSend(ctx, "ShoppingCartObject", userId, "EmptyExpiredCart").Send(restate.Void{})
	// <end_sending_messages>

	return nil
}

func (ActionsExample) DelayedMessagesExample(ctx restate.Context, req map[string]string) error {
	userId := req["userId"]
	message := req["message"]

	// <start_delayed_messages>
	// Schedule reminder for tomorrow
	restate.ServiceSend(ctx, "ReminderService", "SendReminder").Send(
		map[string]string{
			"userId":  userId,
			"message": message,
		},
		restate.WithDelay(24*time.Hour),
	)
	// <end_delayed_messages>

	return nil
}

func (ActionsExample) DurableTimersExample(ctx restate.Context, req map[string]interface{}) error {
	orderId := req["orderId"].(string)
	order := req["order"].(Order)

	// <start_durable_timers>
	// Sleep for specific duration
	if err := restate.Sleep(ctx, 5*time.Minute); err != nil {
		return err
	}

	// Wait for action or timeout
	sleepFuture := restate.After(ctx, 5*time.Minute)
	callFuture := restate.Workflow[restate.Void](ctx, "OrderWorkflow", orderId, "Run").RequestFuture(order)

	selector := restate.Select(ctx, sleepFuture, callFuture)
	switch selector.Select() {
	case sleepFuture:
		if err := sleepFuture.Done(); err != nil {
			return err
		}
		// Timeout occurred
	case callFuture:
		if _, err := callFuture.Response(); err != nil {
			return err
		}
		// Call completed
	}
	// <end_durable_timers>

	return nil
}

// Example Virtual Object that demonstrates state actions
type StateExample struct{}

func (StateExample) StateGetExample(ctx restate.ObjectContext) error {
	// <start_state_get>
	// Get with type and default value
	profile, err := restate.Get[*UserProfile](ctx, "profile")
	if err != nil {
		return err
	}

	count := 0
	if c, err := restate.Get[*int](ctx, "count"); err != nil {
		return err
	} else if c != nil {
		count = *c
	}

	cart := ShoppingCart{}
	if c, err := restate.Get[*ShoppingCart](ctx, "cart"); err != nil {
		return err
	} else if c != nil {
		cart = *c
	}
	// <end_state_get>

	// Use variables to avoid compiler warnings
	_ = profile
	_ = count
	_ = cart

	return nil
}

func (StateExample) StateSetExample(ctx restate.ObjectContext, count int) (restate.Void, error) {
	// <start_state_set>
	// Store simple values
	restate.Set(ctx, "lastLogin", time.Now().Format(time.RFC3339))
	restate.Set(ctx, "count", count+1)

	// Store complex objects
	restate.Set(ctx, "profile", UserProfile{
		Name:  "John Doe",
		Email: "john@example.com",
	})
	// <end_state_set>

	return restate.Void{}, nil
}

func (StateExample) StateClearExample(ctx restate.ObjectContext) (restate.Void, error) {
	// <start_state_clear>
	// Clear specific keys
	restate.Clear(ctx, "shoppingCart")
	restate.Clear(ctx, "sessionToken")

	// Clear all user data
	restate.ClearAll(ctx)
	// <end_state_clear>

	return restate.Void{}, nil
}

// Example Workflow that demonstrates workflow actions
type WorkflowExample struct{}

func (WorkflowExample) Run(ctx restate.WorkflowContext) error {
	// <start_workflow_promises>
	// Wait for external event
	paymentResult, err := restate.Promise[PaymentResult](ctx, "payment-completed").Result()
	if err != nil {
		return err
	}

	// Wait for human approval
	approved, err := restate.Promise[bool](ctx, "manager-approval").Result()
	if err != nil {
		return err
	}

	// Wait for multiple events
	paymentFuture := restate.Promise[PaymentResult](ctx, "payment")
	inventoryFuture := restate.Promise[InventoryResult](ctx, "inventory")

	payment, err := paymentFuture.Result()
	if err != nil {
		return err
	}

	inventory, err := inventoryFuture.Result()
	if err != nil {
		return err
	}
	// <end_workflow_promises>

	// Use results to avoid compiler warnings
	_ = paymentResult
	_ = approved
	_ = payment
	_ = inventory

	return nil
}

// <start_signal_functions>
// In a signal function
func (WorkflowExample) ConfirmPayment(ctx restate.WorkflowSharedContext, result PaymentResult) error {
	if err := restate.Promise[PaymentResult](ctx, "payment-completed").Resolve(result); err != nil {
		return err
	}
	return nil
}

// In a signal function
func (WorkflowExample) ApproveRequest(ctx restate.WorkflowSharedContext, approved bool) error {
	if err := restate.Promise[bool](ctx, "manager-approval").Resolve(approved); err != nil {
		return err
	}
	return nil
}

// <end_signal_functions>
