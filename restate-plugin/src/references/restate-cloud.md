# Restate Cloud

Connect to a remote Restate Cloud environment. Once connected, every `restate` CLI command
in the other references works unchanged against the remote environment.

## Connect as the user (default)

1. Ask the user to log in. This opens a browser, so the user must run it:
   `! restate cloud login`
2. Pick an environment from the ones visible to the user, then switch to it:
   ```bash
   restate cloud env configure
   restate config use-env <name>
   restate whoami
   ```
3. If a command later fails with an authentication error, ask the user to run
   `restate cloud login` again. Do not fall back to API keys on your own.

The CLI acts with the user's own permissions. A user with the Viewer role gives you
read-only access: list and describe deployments, services and invocations, and run
`restate sql`. Suggest a Viewer login when the user only wants inspection or debugging.

Switch back to a local server with `restate config use-env local`.

## Reach the environment from localhost

`restate cloud env tunnel` runs until stopped. Always start it as a background process.

- Expose a local service to Cloud, then register it:
  ```bash
  restate cloud env tunnel --tunnel-name my-tunnel        # background
  restate deployments register --tunnel-name my-tunnel http://localhost:9080
  ```
- Make the remote ingress or admin port available on localhost, so the curl and
  Admin API examples in other references work as written:
  ```bash
  restate cloud env tunnel --remote-port 8080             # background; ingress
  restate cloud env tunnel --remote-port 9070             # background; admin API
  ```

## Headless access with API keys

Use this only when no user is present to log in (CI, scheduled agents). The user
creates the key under Developers > API Keys in the Cloud UI.

```bash
export RESTATE_HOST_SCHEME=https
export RESTATE_HOST=<env-id-without-env_>.env.<region>.restate.cloud
export RESTATE_AUTH_TOKEN=key_...
restate whoami
```

For direct HTTP, send `Authorization: Bearer $RESTATE_AUTH_TOKEN` to
`https://$RESTATE_HOST:8080` (ingress) or `https://$RESTATE_HOST:9070` (admin API).

Ask for the narrowest role that fits the job:

| Job | Role |
|-----|------|
| Invoke handlers | Ingress |
| Complete awakeables only | Complete awakeable |
| Run a tunnel | Tunnel |
| Register deployments, inspect or cancel invocations, edit state | Admin |
| All of the above | Full (last resort) |

The Admin role grants every Admin API write, including kill, purge and state edits.
No API key role is read-only; for read-only access, use a Viewer login instead.

## Managing environments

Account-scoped management keys (`rst:role::ManagementApiAccess`) can create and destroy
environments and mint environment API keys through the Restate Cloud API. They are not
available in the Cloud UI and are high-privilege. Use them only when the user asks the
agent to manage environments, not to work inside one.
