package develop

import (
	restate "github.com/restatedev/sdk-go"
	"log/slog"
)

// <start_review>
type ReviewWorkflow struct{}

func (ReviewWorkflow) Run(ctx restate.WorkflowContext, documentId string) (string, error) {
	// Send document for review
	if _, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return restate.Void{}, askReview(documentId)
	}); err != nil {
		return "", err
	}

	// Wait for external review submission
	// <start_promise>
	review, err := restate.Promise[string](ctx, "review").Result()
	// <end_promise>
	if err != nil {
		return "", err
	}

	// Process the review result
	return processReview(documentId, review)
}

func (ReviewWorkflow) SubmitReview(ctx restate.WorkflowSharedContext, review string) error {
	// Signal the waiting run handler
	return restate.Promise[string](ctx, "review").Resolve(review)
}

// <end_review>

func (ReviewWorkflow) SubmitReviewClean(ctx restate.WorkflowSharedContext, review string) error {
	// To have a clean example without return in front of it
	// <start_resolve_promise>
	err := restate.Promise[string](ctx, "review").Resolve(review)
	if err != nil {
		return err
	}
	// <end_resolve_promise>
	return nil
}

func processReview(id string, review string) (string, error) {
	// Process the review result and return a message
	return "Processed review for document " + id + ": " + review, nil
}

func askReview(id string) error {
	slog.Info("Asking for review", "documentId", id)
	// Simulate asking for a review, e.g., sending an email or notification
	return nil
}
