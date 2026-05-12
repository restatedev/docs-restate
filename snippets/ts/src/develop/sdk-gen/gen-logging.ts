// <start_gen_logger>
import {
  service,
  logger,
  rand,
  date,
  run,
} from "@restatedev/restate-sdk-gen";

export const myService = service({
  name: "MyService",
  handlers: {
    *greet(name: string) {
      // Use logger() instead of console — suppresses duplicate logs during replay
      logger().info(`Greeting ${name}`);

      // Use rand() for deterministic random values
      const id = rand().uuidv4();
      const value = rand().random();

      // Use date() for the current timestamp
      const now = yield* date().now();

      return { id, name, at: now };
    },

    *processJob(jobId: string) {
      const log = logger();
      log.info(`Starting job ${jobId}`);

      const result = yield* run("fetch-data", async () => {
        // Fetch data ...
        return { data: "result" };
      });

      log.debug(`Job ${jobId} complete`, result);
      return result;
    },
  },
});
// <end_gen_logger>
