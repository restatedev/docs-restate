# Restate Plugin for Claude Code

A Claude Code plugin for building, implementing, running, and debugging [Restate](https://restate.dev) applications.

## What's included

- **Restate skill**: Teaches Restate concepts, guides through design and implementation, covers pitfalls and best practices across TypeScript, Python, Java, and Go
- **Restate docs MCP server**: Auto-configured access to the full Restate documentation for testing patterns, deployment, server configuration, and advanced topics

## Installation

```bash
claude plugin add /path/to/restate-plugin
```

Or from GitHub:

```bash
claude plugin add github:restatedev/restate-claude-plugin
```

## What the skill covers

- **Concepts**: Durable execution, service types (Service, Virtual Object, Workflow), programming model
- **Design**: Service type selection, Virtual Object keying strategy, deadlock prevention, architecture patterns
- **Migration/translation**: Mapping from workflow orchestrators and existing applications to Restate
- **Implementation**: Per-SDK API references with pitfall warnings (TypeScript, Python, Java, Go)
- **AI agents**: Integration patterns for Vercel AI SDK, OpenAI Agents SDK, Google ADK, Pydantic AI
- **Debugging**: Common errors, journal mismatches, CLI commands, admin API

## What the MCP server covers

The bundled MCP server at `https://docs.restate.dev/mcp` provides access to the full Restate documentation, including:

- Testing patterns per SDK
- Deployment guides (Kubernetes, Lambda, Vercel, Cloudflare Workers)
- Server configuration
- Kafka integration
- Cluster management
- Security and authentication
- SQL introspection reference

## Resources

- [Restate documentation](https://docs.restate.dev)
- [Restate examples](https://github.com/restatedev/examples)
- [Restate AI examples](https://github.com/restatedev/ai-examples)
- [Discord](https://discord.restate.dev)



## TODO
- Figure out how to make the skills stay up to date with new releases
- We miss commands for start-restate, register-service, list-services, get-openapi-spec, etc.
- Add TS and Python lsp servers
- Reference to Restate SDK service context in the SDK skill references