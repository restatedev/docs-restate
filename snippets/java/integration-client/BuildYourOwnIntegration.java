package services.integrations;

import dev.restate.integration.ExactlyOnceProducer;
import dev.restate.integration.IntegrationClient;
import dev.restate.integration.Invocation;
import dev.restate.integration.InvocationMetadata;
import dev.restate.integration.Producer;

public final class BuildYourOwnIntegration {

  private BuildYourOwnIntegration() {}

  static void run(Iterable<SourceRecord> records) {
    // <start_client>
    try (IntegrationClient client = IntegrationClient.builder("http://localhost:8080").build()) {
      // Use client
    }
    // <end_client>
  }

  static void sendAtLeastOnce(IntegrationClient client, Iterable<SourceRecord> records) {
    // <start_producer>
    try (Producer producer = client.newProducer()) {
      for (SourceRecord record : records) {
        producer.send(
            Invocation.create()
                .setServiceName("OrderService")
                .setHandlerName("ingest")
                .putHeader("content-type", "application/json")
                .setBody(record.payload()));
      }
      producer.flush();
    }
    // <end_producer>
  }

  static long sendExactlyOnce(IntegrationClient client, Iterable<SourceRecord> sourceRecords) {
    // <start_exactly_once_producer>
    try (ExactlyOnceProducer producer = client.newExactlyOnceProducer("orders/partition-0")) {
      for (SourceRecord record : sourceRecords) {
        producer.send(
            record.offset(),
            Invocation.create()
                .setServiceName("OrderService")
                .setHandlerName("ingest")
                .putHeader("content-type", "application/json")
                .setBody(record.payload()));
      }
      return producer.flush();
    }
    // <end_exactly_once_producer>
  }

  static void sendWithDefaults(IntegrationClient client, Iterable<SourceRecord> records) {
    // <start_producer_defaults>
    InvocationMetadata defaults =
        InvocationMetadata.create()
            .setServiceName("OrderService")
            .setHandlerName("ingest")
            .putHeader("content-type", "application/json");

    try (Producer producer = client.newProducer(defaults)) {
      for (SourceRecord record : records) {
        producer.send(Invocation.create().setBody(record.payload()));
      }
      producer.flush();
    }
    // <end_producer_defaults>
  }

  record SourceRecord(long offset, byte[] payload) {}
}
