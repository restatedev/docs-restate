package tour.workflows;

// <start_here>
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.lambda.BaseRestateLambdaHandler;

class MyLambdaHandler extends BaseRestateLambdaHandler {
  @Override
  public void register(Endpoint.Builder builder) {
    builder.bind(new SignupWorkflow());
  }
}
// <end_here>
