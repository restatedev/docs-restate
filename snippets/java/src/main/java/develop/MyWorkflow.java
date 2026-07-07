package develop;

// <start_here>
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

@Workflow
public class MyWorkflow {

  @Workflow
  public String run(String input) {

    // implement workflow logic here

    return "success";
  }

  @Shared
  public String interactWithWorkflow(String input) {
    // implement interaction logic here
    return "my result";
  }

  public static void main(String[] args) {
    RestateHttpServer.listen(Endpoint.bind(new MyWorkflow()));
  }
}
// <end_here>
