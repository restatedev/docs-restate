package develop

// <start_here>
import dev.restate.sdk.interceptor.opentelemetry.kotlin.OpenTelemetryInterceptorFactory
import dev.restate.sdk.kotlin.HandlerRunner
import dev.restate.sdk.kotlin.endpoint.endpoint
import io.opentelemetry.api.OpenTelemetry
import io.opentelemetry.sdk.OpenTelemetrySdk

fun otelTracedEndpoint() {
  val openTelemetry: OpenTelemetry =
      OpenTelemetrySdk.builder().build() // your OpenTelemetry instance
  val otel = OpenTelemetryInterceptorFactory(openTelemetry)

  val endpoint = endpoint {
    bind(
        MyService(),
        HandlerRunner.Options(
            handlerInterceptorFactories = mutableListOf(otel),
            runInterceptorFactories = mutableListOf(otel),
        ),
    )
  }
}
// <end_here>
