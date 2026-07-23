package develop

import restate "github.com/restatedev/sdk-go"

type CoordinationService struct{}

func (CoordinationService) WaitForApproval(ctx restate.Context) (bool, error) {
	// <start_one_shot>
	approval, err := restate.Signal[bool](ctx, "approval").Result()
	// <end_one_shot>
	return approval, err
}


// <start_wait>
func (CoordinationService) ReviseUntilDone(ctx restate.Context, topic string) (string, error) {
	draft := "Research notes for " + topic
	for {
		text, err := restate.Signal[string](ctx, "steer").Result()
		if err != nil {
			return "", err
		}
		if text == "done" {
			return draft, nil
		}
		draft += "\n" + text
	}
}

// <end_wait>

type SteerRequest struct {
	InvocationID string `json:"invocationId"`
	Text         string `json:"text"`
}

func (CoordinationService) SteerInvocation(ctx restate.Context, req SteerRequest) error {
	// <start_resolve>
	restate.ResolveSignal(ctx, req.InvocationID, "steer", req.Text)
	// <end_resolve>
	return nil
}

