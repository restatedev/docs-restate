package develop

import restate "github.com/restatedev/sdk-go"

type SignalsTestGo struct{}

// <start_one_shot>
func (SignalsTestGo) WaitForApproval(ctx restate.Context) (bool, error) {
	return restate.Signal[bool](ctx, "approval").Result()
}

// <end_one_shot>

// <start_wait>
func (SignalsTestGo) ReviseUntilDone(ctx restate.Context, topic string) (string, error) {
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

// <start_resolve>
func (SignalsTestGo) SteerInvocation(ctx restate.Context, req SteerRequest) error {
	restate.ResolveSignal(ctx, req.InvocationID, "steer", req.Text)
	return nil
}

// <end_resolve>
