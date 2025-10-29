#!/usr/bin/env bash
shopt -s nullglob

if [ -z "$1" ]
  then
    echo "You must provide the restate project path"
fi

RESTATE_PATH=$1
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
OUT_FILE=$SCRIPT_DIR/../docs/docs/references/sql-introspection.mdx

cat > $OUT_FILE << EOF
---
title: "SQL Introspection API"
description: "API reference for inspecting the invocation status and service state."
---
EOF

pushd $RESTATE_PATH

cargo xtask generate-table-docs >> $OUT_FILE

popd