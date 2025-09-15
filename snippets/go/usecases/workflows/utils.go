package workflows

import (
	restate "github.com/restatedev/sdk-go"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type CreateUserRequest struct {
	UserID string `json:"user_id"`
	User   User   `json:"user"`
}

type SignupResult struct {
	Success bool `json:"success"`
}

func CreateUser(userID string, user User) (bool, error) {
	// Simulate user activation
	return true, nil
}

func ActivateUser(userID string) (restate.Void, error) {
	// Simulate user activation
	return restate.Void{}, nil
}

func SendWelcomeEmail(user User) (restate.Void, error) {
	// Simulate sending welcome email
	return restate.Void{}, nil
}
