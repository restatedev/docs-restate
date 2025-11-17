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
To update the Restate configuration JSON schema, add it as `snippets/schemas/restate-server-configuration-schema.json` and run:

```shell
node scripts/generate-restate-config-viewer.js
```

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
cd code_snippets/ts
npm run format
```

For Java:
```
cd code_snippets/java
./gradlew spotlessApply
```

For Kotlin:
```
cd code_snippets/kotlin
./gradlew spotlessApply
```

For Go:
```
cd code_snippets/go
go fmt
```

For Python:
```
cd code_snippets/python
python3 -m black .
```
