#!/bin/bash

set -e

rm -rf ./dist
mkdir -p ./dist

esbuild \
  --bundle --sourcemap=linked --minify --charset=utf8 \
  --loader:.svg=dataurl \
  --format=iife --global-name=BirthdayCake \
  ./src/client-main.ts \
  --outfile=./src/client.dist.js

esbuild \
  --bundle --platform=node --sourcemap=inline --minify --charset=utf8 \
  --banner:js="#!/usr/bin/env node" \
  --loader:.dist.js=text --loader:.dist.js.map=text --loader:.html=text \
  ./src/server-main.ts \
  --outfile=./dist/server.js

chmod a+x ./dist/server.js

rm -f ./src/client.dist.js ./src/client.dist.js.map

esbuild \
  --bundle --sourcemap=inline --minify --charset=utf8 \
  --loader:.svg=dataurl \
  --format=iife --global-name=BirthdayCake \
  ./src/local-main.ts \
  --outfile=./src/local.dist.js

LOCAL_DIST_JS="$(cat ./src/local.dist.js)" \
envsubst < ./src/local.html > ./dist/local.html

rm -f ./src/local.dist.js
