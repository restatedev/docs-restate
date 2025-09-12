package services.configuration;

import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;
import java.time.Duration;

@Workflow
public class MyWorkflow {

  @Workflow
  public void run(WorkflowContext context) {
    // Workflow implementation
  }

  public static void main(String[] args) {
    // <start_options>
    // Specify service options when binding them to an endpoint
    RestateHttpServer.listen(
        Endpoint.bind(
            new MyWorkflow(),
            conf ->
                conf.abortTimeout(Duration.ofMinutes(15))
                    .inactivityTimeout(Duration.ofMinutes(15))
                    .idempotencyRetention(Duration.ofDays(3))
                    .workflowRetention(Duration.ofDays(10)) // Only for workflows
                    .journalRetention(Duration.ofDays(7))
                    .ingressPrivate(true)
                    .enableLazyState(true)));
    // <end_options>
  }

  public static void secondOption(String[] args) {
    // <start_handleropts>
    // Or specify handler options when binding their service to an endpoint
    RestateHttpServer.listen(
        Endpoint.bind(
            new MyWorkflow(),
            conf ->
                conf.configureHandler(
                    "run",
                    handlerConf ->
                        handlerConf
                            .abortTimeout(Duration.ofMinutes(15))
                            .inactivityTimeout(Duration.ofMinutes(15))
                            .journalRetention(Duration.ofDays(7))
                            .ingressPrivate(true)
                            .enableLazyState(true))));
    // <end_handleropts>
  }
}
