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

esbuild \
  --bundle \
  --loader:.svg=dataurl \
  ./src/local-main.ts \
  --outfile=./dist/local.js

cp ./src/local.html ./dist/local.html
