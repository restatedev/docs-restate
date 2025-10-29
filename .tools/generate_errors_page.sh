#!/usr/bin/env bash
shopt -s nullglob

if [ -z "$1" ]
  then
    echo "You must provide the path where the error codes are"
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
IN_PATH=$1
OUT_TMP_FILE=$SCRIPT_DIR/../docs/references/errors-tmp.mdx
OUT_FILE=$SCRIPT_DIR/../docs/references/errors.mdx

cat > $OUT_TMP_FILE << EOF
---
title: "Error Codes"
description: "Descriptions of error codes emitted by Restate components"
---

This page contains the list of error codes emitted by Restate components.

EOF

for md_file in $(find $IN_PATH -type f -name "*.md" | sort); do
    echo "Using $md_file";
    printf "$(cat $md_file)\n\n" >> $OUT_TMP_FILE;
done

mv $OUT_TMP_FILE $OUT_FILE
echo "Generated $OUT_FILE"