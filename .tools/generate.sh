#!/usr/bin/env bash
shopt -s nullglob

if [ -z "$1" ]
  then
    echo "You must provide the restate project path"
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DOCS_DIR=$SCRIPT_DIR/../
RESTATE_PATH=$DOCS_DIR/$1

# Generate docs
echo "Generate errors.md"
$SCRIPT_DIR/generate_errors_page.sh $RESTATE_PATH/crates/errors/src/error_codes


echo "Generate OpenAPI"
$SCRIPT_DIR/generate_openapi_admin_spec.sh $RESTATE_PATH

pushd $RESTATE_PATH

echo "Generate config schema"
cargo xtask generate-config-schema > $DOCS_DIR/docs/schemas/restate-server-configuration-schema.json
# temporary fixes
sed -i 's/(<5)/(less than 5 nodes)/g' $DOCS_DIR/docs/schemas/restate-server-configuration-schema.json
sed -i 's/<region>/region/g' $DOCS_DIR/docs/schemas/restate-server-configuration-schema.json

echo "Generate default config"
cargo xtask generate-default-config > $DOCS_DIR/docs/schemas/restate.toml

echo "Generate sql introspection page"
$SCRIPT_DIR/generate_sql_introspection_page.sh $RESTATE_PATH

popd

pushd $DOCS_DIR
npm i
node scripts/generate-restate-config-viewer.js
node scripts/loadScripts.js
popd