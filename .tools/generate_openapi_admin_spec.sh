#!/usr/bin/env bash
shopt -s nullglob

if [ -z "$1" ]
  then
    echo "You must provide the restate project path"
fi

RESTATE_PATH=$1
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
OUT_FILE=$SCRIPT_DIR/../docs/schemas/openapi-admin.json

pushd $RESTATE_PATH

cargo xtask generate-rest-api-doc > $OUT_FILE

# Post-process the OpenAPI file to fix validation issues
sed -i 's/"style": "simple",//g' $OUT_FILE
sed -i 's/"404 Not Found"/"404"/g' $OUT_FILE
sed -i 's/"503 Service Unavailable"/"503"/g' $OUT_FILE
sed -i 's/"400 Bad Request"/"400"/g' $OUT_FILE
sed -i 's/"409 Conflict"/"409"/g' $OUT_FILE
sed -i 's/"422 Unprocessable Entity"/"422"/g' $OUT_FILE
sed -i 's/"410 Gone"/"410"/g' $OUT_FILE
sed -i 's/"425 Too Early"/"425"/g' $OUT_FILE

popd