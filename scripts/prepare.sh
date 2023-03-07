#!/bin/bash

set -e

command -V flatc 2>/dev/null || (
  echo "downloading flatc binary"
  mkdir -p ./node_modules/.bin
  cd ./node_modules/.bin
  wget -q -O flatc.zip https://github.com/google/flatbuffers/releases/download/v23.3.3/Linux.flatc.binary.clang++-12.zip
  unzip -q flatc.zip
  rm -f flatc.zip
  cd ../..
  command -V flatc
)

flatc --version
rm -rf ./src/flatbuffers
flatc --ts -o ./src/flatbuffers ./src/schema.fbs
