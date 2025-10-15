package develop.agentsmd;

import dev.restate.client.Client;
import develop.MyObjectClient;
import develop.MyServiceClient;

import java.time.Duration;

public class Clients {

    public void clientExamples() {
        // <start_here>
        Client restateClient = Client.connect("http://localhost:8080");

        // Request-response
        String result = MyServiceClient.fromClient(restateClient).myHandler("Hi");

        // One-way
        MyServiceClient.fromClient(restateClient).send().myHandler("Hi");

        // Delayed
        MyServiceClient.fromClient(restateClient).send().myHandler("Hi", Duration.ofSeconds(1));

        // With idempotency key
        MyObjectClient.fromClient(restateClient, "Mary")
                .send()
                .myHandler("Hi", opt -> opt.idempotencyKey("abc"));
        // <end_here>
    }
}