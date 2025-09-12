package develop;

// <start_here>
import dev.restate.sdk.auth.signing.RestateRequestIdentityVerifier;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

class MySecureApp {
  public static void main(String[] args) {
    var endpoint =
        Endpoint.bind(new MyService())
            .withRequestIdentityVerifier(
                RestateRequestIdentityVerifier.fromKeys(
                    "publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f"));
    RestateHttpServer.listen(endpoint);
  }
}
// <end_here>
