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
    RestateHttpServer.listen(
        Endpoint.builder()
            .bind(
                new MyWorkflow(),
                conf ->
                    conf.abortTimeout(Duration.ofMinutes(15))
                        .inactivityTimeout(Duration.ofMinutes(15))
                        .idempotencyRetention(Duration.ofDays(3))
                        .journalRetention(Duration.ofDays(7))
                        .ingressPrivate(true)
                        .enableLazyState(true))
            .build());
    // <end_options>
  }

  public static void secondOption(String[] args) {
    // <start_handleropts>
    RestateHttpServer.listen(
            Endpoint.builder()
                    .bind(
                            new MyWorkflow(),
                            conf ->
                                    conf.configureHandler("run", handlerConf ->
                                            handlerConf.abortTimeout(Duration.ofMinutes(15))
                                                    .inactivityTimeout(Duration.ofMinutes(15))
                                                    .workflowRetention(Duration.ofDays(3))
                                                    // or idempotencyRetention for Services/Objects
                                                    .journalRetention(Duration.ofDays(7))
                                                    .ingressPrivate(true)
                                                    .enableLazyState(true)))
                    .build());
    // <end_handleropts>
  }
}
