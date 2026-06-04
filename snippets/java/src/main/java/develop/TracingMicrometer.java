package develop;

// <start_here>
import dev.restate.sdk.HandlerRunner;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.interceptor.micrometer.MicrometerInterceptorFactory;
import io.micrometer.observation.ObservationRegistry;

class MyMicrometerApp {
  public static void main(String[] args) {
    ObservationRegistry registry = ObservationRegistry.create(); // your ObservationRegistry
    var micrometer = new MicrometerInterceptorFactory(registry);

    var endpoint =
        Endpoint.bind(
                new MyService(),
                new HandlerRunner.Options()
                    .addHandlerInterceptorFactory(micrometer)
                    .addRunInterceptorFactory(micrometer))
            .build();
  }
}
// <end_here>
