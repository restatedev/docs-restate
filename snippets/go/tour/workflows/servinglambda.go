package workflows

import (
	"log"

	"github.com/aws/aws-lambda-go/lambda"
	restate "github.com/restatedev/sdk-go"
	server "github.com/restatedev/sdk-go/server"
)

type SignupWorkflow struct{}

func serveLambda() {
	// <start_here>
	handler, err := server.NewRestate().
		Bind(restate.Reflect(SignupWorkflow{})).
		Bidirectional(false).
		LambdaHandler()
	if err != nil {
		log.Fatal(err)
	}
	lambda.Start(handler)
	// <end_here>

}
