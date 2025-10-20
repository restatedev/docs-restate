package main

import (
	restate "github.com/restatedev/sdk-go"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func createUserEntry(userId string, user User) (restate.Void, error) {
	return restate.Void{}, nil
}

func sendVerificationEmail(user User, email string) (restate.Void, error) {
	return restate.Void{}, nil
}

// <start_here>
type SignupWorkflow struct{}

func (SignupWorkflow) Run(ctx restate.WorkflowContext, user User) (bool, error) {
	// workflow ID = user ID; workflow runs once per user
	userId := restate.Key(ctx)

	_, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return createUserEntry(userId, user)
	})
	if err != nil {
		return false, err
	}

	secret := restate.UUID(ctx).String()
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return sendVerificationEmail(user, secret)
	})
	if err != nil {
		return false, err
	}

	clickSecret, err := restate.Promise[string](ctx, "email-link-clicked").Result()
	if err != nil {
		return false, err
	}

	return clickSecret == secret, nil
}

func (SignupWorkflow) Click(ctx restate.WorkflowSharedContext, secret string) error {
	return restate.Promise[string](ctx, "email-link-clicked").Resolve(secret)
}

// <end_here>
