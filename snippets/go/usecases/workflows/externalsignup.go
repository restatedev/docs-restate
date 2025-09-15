package workflows

import (
	restate "github.com/restatedev/sdk-go"
)

type UserService struct{}

func (UserService) CreateUser(ctx restate.Context, req CreateUserRequest) (bool, error) {
	// Simulate DB call
	return true, nil
}

type ExternalUserSignup struct{}

func (ExternalUserSignup) Run(ctx restate.WorkflowContext, user User) (bool, error) {
	userID := restate.Key(ctx)

	// <start_here>
	// Move user DB interaction to dedicated service
	success, err := restate.Service[bool](ctx, "UserService", "createUser").Request(CreateUserRequest{
		UserID: userID,
		User:   user,
	})
	if err != nil || !success {
		return false, err
	}

	// Execute other steps inline
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
	// <end_here>

	return true, nil
}
