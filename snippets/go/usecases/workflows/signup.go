package workflows

import (
	restate "github.com/restatedev/sdk-go"
)

type UserSignup struct{}

// <start_here>
func (UserSignup) Run(ctx restate.WorkflowContext, user User) (bool, error) {
	// unique workflow key
	userID := restate.Key(ctx)

	// Use regular if/else, loops, and functions
	success, err := restate.Run(ctx, func(ctx restate.RunContext) (bool, error) {
		return CreateUser(userID, user)
	})
	if err != nil || !success {
		return false, err
	}

	// Execute durable steps
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return ActivateUser(userID)
	})
	if err != nil {
		return false, err
	}

	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return SendWelcomeEmail(user)
	})
	if err != nil {
		return false, err
	}

	return true, nil
}

// <end_here>
