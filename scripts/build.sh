#!/bin/bash

set -e

rm -rf ./dist
mkdir -p ./dist

esbuild \
  --bundle --platform=node \
  ./src/server-main.ts \
  --outfile=./dist/server.js

esbuild \
  --bundle \
  --loader:.svg=dataurl \
  ./src/client-main.ts \
  --outfile=./dist/client.js

cp ./src/index.html ./dist/index.html
