# Restate Documentation

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of the repository:

```
cd docs
mint dev
```

View your local preview at `http://localhost:3000`.

## Publishing changes

The main branch is automatically deployed to the production documentation site. 

### Code snippets
To update code snippets in the documentation, run:

```shell
node scripts/loadScripts.js
```


### Restate configuration schema
To update the Restate configuration JSON schema, add it as `docs/schemas/restate-server-configuration-schema.json` and run, from the repository root:

```shell
node scripts/generate-restate-config-viewer.js
```

For a complete release refresh, use the workflow below, which also regenerates the configuration schema from the runtime.

### Pre-release updates

Use the [Pre-release updates workflow](https://github.com/restatedev/docs-restate/actions/workflows/pre-release.yml) to refresh generated documentation for a release. When you supply `restateVersion`, it checks out the corresponding runtime tag and regenerates the Admin OpenAPI document, configuration schema and reference, default configuration, SQL introspection reference, and error reference. It validates the Admin OpenAPI document and opens or updates a PR with the generated changes.

1. Open the workflow and select **Run workflow**. Under **Use workflow from**, select the documentation staging branch, such as `release/1.8`, for an upcoming release. Use `main` for updates intended for the live documentation.
2. Set `restateVersion` to an existing runtime version **without the leading `v`**. For example, `1.8.0-rc.1` requires the tag `v1.8.0-rc.1` to exist in `restatedev/restate`. Leave SDK version inputs empty unless you also want to update those SDKs and their examples.
3. Review the workflow results and generated PR. Check that its base is the intended documentation branch, and merge release updates into the staging branch. Publish that branch to `main` when the release is available, since `main` deploys to production.

The workflow uses [`.tools/generate.sh`](.tools/generate.sh). The individual generators are [Admin OpenAPI](.tools/generate_openapi_admin_spec.sh) and [SQL introspection](.tools/generate_sql_introspection_page.sh); for rendering a configuration schema you already have, follow [Restate configuration schema](#restate-configuration-schema) above.

## Adding guides 

1. Add the mdx to `docs/guides`. Make sure it has a title, description, and a single tag (either `recipe`, `development`, `deployment`, or `integration`).
   - Example:
     ```mdx
     ---
     title: "Guide Title"
     description: "Short description of the guide."
     tags: ["recipe"]
     ---
     ```
2. Add the thumbnail image to `docs/img/guides/{guide-name}/{guide-name}.png`
3. Add the guide to the sidebar in `docs/docs.json`

No need to add the guide to the overview. This is done automatically when running:
```shell
node loadScripts.js
```


#### Formatting code snippets

For TS:
```
cd snippets/ts
npm run format
```

For Java:
```
cd snippets/java
./gradlew spotlessApply
```

For Kotlin:
```
cd snippets/kotlin
./gradlew spotlessApply
```

For Go:
```
cd snippets/go
go fmt ./...
```

For Python:
```
cd snippets/python
python3 -m black .
```
