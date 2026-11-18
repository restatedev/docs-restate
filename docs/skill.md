---
name: restatedev
description: Use when building AI agents, workflows, microservices, and stateful
  backends with Restate. Restate provides building blocks that compose into
  these applications, including durable execution, stateful Virtual Objects,
  durable RPC and queues, timers and signals, and concurrency limits. Reach for
  Restate when processes must be reliable, long-running, stateful, or
  coordinated across services.
---

# Restate

Restate is a durable runtime for AI agents and backends. It provides building blocks that compose into agents, workflows, and microservices:

- **Durable execution**: Restate records each step of a handler in a journal and resumes the handler after a failure without repeating completed steps.
- **Virtual Objects**: Keyed entities, such as agent sessions, user accounts, or shopping carts, with built-in key-value state and one writer per key at a time.
- **Durable RPC and queues**: Request-response and one-way calls between services, with retries and idempotency.
- **Timers and signals**: Handlers can sleep or wait for external events, such as human approvals or webhooks, for days or months.
- **Flow control**: Concurrency limits cap how many invocations run at once, for example to control model spend or protect a downstream API.
- **Observability and control**: The Restate UI and CLI show the execution journal of each invocation and let you cancel, kill, pause, resume, or restart it.

Restate runs as a single binary. You can self-host it, use Restate Cloud, or run it in your own cloud account with Restate BYOC. Your services run on serverless platforms, containers, or sandboxes, and use the Restate SDKs for TypeScript, Python, Java, Kotlin, Go, Rust, and Ruby.

## Install the Restate skills

This file is a summary. The maintained Restate skills live in the [`restatedev/skills`](https://github.com/restatedev/skills) repository. They cover service design, SDK APIs and common pitfalls for TypeScript, Python, Java, and Go, AI agent integrations, debugging, and migration to Restate.

Install the skills before you write Restate code:

```bash
npx skills add restatedev/skills
```

For Claude Code, Cursor, and Codex, the repository also ships a plugin that bundles the skills with the documentation MCP server. See the [`restatedev/skills` README](https://github.com/restatedev/skills#install-plugin) for the install commands for each agent.

## Search the documentation

The Restate documentation is available as an MCP server at `https://docs.restate.dev/mcp`. Use it to search conceptual guides, deployment instructions, server configuration, and SDK references.

For a plain-text index of all pages, fetch https://docs.restate.dev/llms.txt.

## Start here

- [Quickstart](https://docs.restate.dev/quickstart): Run the Restate Server and a first service.
- [AI agent quickstart](https://docs.restate.dev/ai-quickstart): Build a durable AI agent.
- [Key concepts](https://docs.restate.dev/foundations/key-concepts): Durable execution, state, communication, and flow control.
- [Services](https://docs.restate.dev/foundations/services): Basic Services, Virtual Objects, and Workflows, and when to use each.
- [Service configuration](https://docs.restate.dev/services/configuration): Retries, timeouts, retention, and state access.
- [Coding agent setup](https://docs.restate.dev/develop/ai-assistant): Install the plugin and the MCP server in your coding agent.
