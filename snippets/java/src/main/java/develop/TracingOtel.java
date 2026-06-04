package develop;

// <start_here>
import dev.restate.sdk.HandlerRunner;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.interceptor.opentelemetry.OpenTelemetryInterceptorFactory;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.sdk.OpenTelemetrySdk;

class MyOtelApp {
  public static void main(String[] args) {
    OpenTelemetry openTelemetry = OpenTelemetrySdk.builder().build(); // your OpenTelemetry instance
    var otel = new OpenTelemetryInterceptorFactory(openTelemetry);

    var endpoint =
        Endpoint.bind(
                new MyService(),
                new HandlerRunner.Options()
                    .addHandlerInterceptorFactory(otel)
                    .addRunInterceptorFactory(otel))
            .build();
  }
}
// <end_here>
