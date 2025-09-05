package foundations.actions;

import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

public class App {
  public static void main(String[] args) {
    RestateHttpServer.listen(
        Endpoint.bind(new ValidationService())
            .bind(new NotificationService())
            .bind(new AnalyticsService())
            .bind(new ReminderService())
            .bind(new ShoppingCartObject())
            .bind(new UserAccount())
            .bind(new OrderWorkflow())
            .bind(new ActionsExample())
            .bind(new StateExample())
            .bind(new WorkflowExample()));
  }
}
