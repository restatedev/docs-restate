import * as restate from "@restatedev/restate-sdk";
import { createHmac, timingSafeEqual } from "node:crypto";

type PullRequestEvent = {
  action: string;
  number: number;
  repository: { full_name: string };
};

const pullRequest = restate.object({
  name: "PullRequest",
  handlers: {
    onEvent: async (ctx: restate.ObjectContext, event: PullRequestEvent) => {
      // Process the event
    },
  },
});

// <start_sdk>
import { verify } from "@octokit/webhooks-methods";

const gitHubWebhookWithSdk = restate.service({
  name: "GitHubWebhook",
  handlers: {
    receive: restate.handlers.handler(
      // Accept any content type and receive the body as raw bytes
      { input: restate.serde.binary, accept: "*/*" },
      async (ctx: restate.Context, body: Uint8Array) => {
        // The sender's headers, with lower-case names
        const headers = ctx.request().headers;

        // Octokit takes the body as a string. GitHub sends UTF-8 JSON, so
        // the string re-encodes to the exact bytes GitHub signed.
        const signed = await verify(
          process.env.GITHUB_WEBHOOK_SECRET!,
          new TextDecoder().decode(body),
          headers.get("x-hub-signature-256") ?? ""
        );
        if (!signed) {
          throw new restate.TerminalError("Invalid signature", {
            errorCode: 401,
          });
        }

        // Then hand off the work, as in the next example, and return
      }
    ),
  },
});
// <end_sdk>

// <start_github>
// Compares a computed signature with the one the sender sent, in constant time
function signatureMatches(expected: string, received: string | undefined) {
  if (received === undefined) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

const gitHubWebhook = restate.service({
  name: "GitHubWebhook",
  handlers: {
    receive: restate.handlers.handler(
      // Accept any content type and receive the body as raw bytes
      { input: restate.serde.binary, accept: "*/*" },
      async (ctx: restate.Context, body: Uint8Array) => {
        const headers = ctx.request().headers;

        // Verify the signature over the raw body
        const secret = process.env.GITHUB_WEBHOOK_SECRET!;
        const expected =
          "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
        if (!signatureMatches(expected, headers.get("x-hub-signature-256"))) {
          throw new restate.TerminalError("Invalid signature", {
            errorCode: 401,
          });
        }

        // Forward the work, once per delivery, and return right away
        if (headers.get("x-github-event") === "pull_request") {
          const event: PullRequestEvent = JSON.parse(
            new TextDecoder().decode(body)
          );
          const key = `${event.repository.full_name}#${event.number}`;
          ctx.objectSendClient(pullRequest, key).onEvent(
            event,
            restate.rpc.sendOpts({
              idempotencyKey: headers.get("x-github-delivery"),
            })
          );
        }
      }
    ),
  },
});
// <end_github>

type LinearEvent = {
  type: string;
  action: string;
  data: { id: string };
  webhookTimestamp: number;
};

const linearIssue = restate.object({
  name: "LinearIssue",
  handlers: {
    onEvent: async (ctx: restate.ObjectContext, event: LinearEvent) => {
      // Process the event
    },
  },
});

// <start_linear>
const MAX_AGE_MS = 60_000;

const linearWebhook = restate.service({
  name: "LinearWebhook",
  handlers: {
    receive: restate.handlers.handler(
      { input: restate.serde.binary, accept: "*/*" },
      async (ctx: restate.Context, body: Uint8Array) => {
        const headers = ctx.request().headers;

        const secret = process.env.LINEAR_WEBHOOK_SECRET!;
        const expected = createHmac("sha256", secret)
          .update(body)
          .digest("hex");
        if (!signatureMatches(expected, headers.get("linear-signature"))) {
          throw new restate.TerminalError("Invalid signature", {
            errorCode: 401,
          });
        }

        const event: LinearEvent = JSON.parse(new TextDecoder().decode(body));
        const now = await ctx.date.now();
        if (Math.abs(now - event.webhookTimestamp) > MAX_AGE_MS) {
          throw new restate.TerminalError("Delivery too old", {
            errorCode: 401,
          });
        }

        if (event.type === "Issue") {
          ctx.objectSendClient(linearIssue, event.data.id).onEvent(
            event,
            restate.rpc.sendOpts({
              idempotencyKey: headers.get("linear-delivery"),
            })
          );
        }
      }
    ),
  },
});
// <end_linear>

type SlackMessageEvent = { type: string; channel: string; text: string };

const slackChannel = restate.object({
  name: "SlackChannel",
  handlers: {
    onEvent: async (ctx: restate.ObjectContext, event: SlackMessageEvent) => {
      // Process the event
    },
  },
});

// <start_slack>
const SLACK_MAX_AGE_SECONDS = 5 * 60;

async function verifySlackRequest(ctx: restate.Context, body: Uint8Array) {
  const headers = ctx.request().headers;
  const timestamp = headers.get("x-slack-request-timestamp") ?? "";

  const secret = process.env.SLACK_SIGNING_SECRET!;
  const expected =
    "v0=" +
    createHmac("sha256", secret)
      .update(`v0:${timestamp}:`)
      .update(body)
      .digest("hex");
  const ageSeconds = (await ctx.date.now()) / 1000 - Number(timestamp);
  if (
    !signatureMatches(expected, headers.get("x-slack-signature")) ||
    Math.abs(ageSeconds) > SLACK_MAX_AGE_SECONDS
  ) {
    throw new restate.TerminalError("Invalid signature", { errorCode: 401 });
  }
}

const slackWebhook = restate.service({
  name: "SlackWebhook",
  handlers: {
    // Request URL of the Events API subscription
    events: restate.handlers.handler(
      { input: restate.serde.binary, accept: "*/*" },
      async (ctx: restate.Context, body: Uint8Array) => {
        await verifySlackRequest(ctx, body);
        const payload = JSON.parse(new TextDecoder().decode(body));

        if (payload.type === "url_verification") {
          return { challenge: payload.challenge };
        }
        if (
          payload.type === "event_callback" &&
          payload.event.type === "message"
        ) {
          ctx
            .objectSendClient(slackChannel, payload.event.channel)
            .onEvent(
              payload.event,
              restate.rpc.sendOpts({ idempotencyKey: payload.event_id })
            );
        }
        return {};
      }
    ),

    // Request URL of a slash command
    command: restate.handlers.handler(
      { input: restate.serde.binary, accept: "*/*" },
      async (ctx: restate.Context, body: Uint8Array) => {
        await verifySlackRequest(ctx, body);
        const form = new URLSearchParams(new TextDecoder().decode(body));

        return {
          response_type: "ephemeral",
          text: `Received ${form.get("command")} ${form.get("text")}`,
        };
      }
    ),
  },
});
// <end_slack>

restate.serve({
  services: [
    gitHubWebhook,
    pullRequest,
    linearWebhook,
    linearIssue,
    slackWebhook,
    slackChannel,
  ],
});
export { gitHubWebhookWithSdk };
