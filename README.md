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

For a complete generated-reference refresh, use the workflow below, which also regenerates the configuration schema from the runtime.

### Updating generated documentation

Use the [Pre-release updates workflow](https://github.com/restatedev/docs-restate/actions/workflows/pre-release.yml) to refresh runtime references, update SDK versions and examples, or prepare documentation for an upcoming release.

When you supply `restateVersion`, the workflow checks out the corresponding runtime tag and regenerates the Admin OpenAPI document, configuration schema and reference, default configuration, SQL introspection reference, and error reference. It also validates the Admin OpenAPI document. SDK version inputs update the corresponding version references and example dependencies. The workflow opens or updates a PR with the generated changes.

1. Open the workflow and select **Run workflow**. Under **Use workflow from**, select the documentation branch you want to update: `main` for live documentation, or a staging branch such as `release/1.8` for an upcoming release. **The generated PR targets the selected branch**: the workflow checks out that branch, and the PR action uses it as the default base.
2. Provide the version inputs you want to update, leaving the others empty. For runtime references, set `restateVersion` **without the leading `v`**; the corresponding tag must already exist in `restatedev/restate`. SDK-only updates can leave `restateVersion` empty.
3. Review the workflow results and generated PR before merging. Merging into `main` publishes to production; merge staged documentation into `main` when the release is available.

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
