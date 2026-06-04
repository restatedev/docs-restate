package develop

// <start_here>
import dev.restate.sdk.interceptor.micrometer.kotlin.MicrometerInterceptorFactory
import dev.restate.sdk.kotlin.HandlerRunner
import dev.restate.sdk.kotlin.endpoint.endpoint
import io.micrometer.observation.ObservationRegistry

fun micrometerTracedEndpoint() {
  val registry: ObservationRegistry = ObservationRegistry.create() // your ObservationRegistry
  val micrometer = MicrometerInterceptorFactory(registry)

  val endpoint = endpoint {
    bind(
        MyService(),
        HandlerRunner.Options(
            handlerInterceptorFactories = mutableListOf(micrometer),
            runInterceptorFactories = mutableListOf(micrometer),
        ),
    )
  }
}
// <end_here>
