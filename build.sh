#!/bin/bash
set -o errexit # Exit on error

rm -rf build

node build.js
cp -r src/static/* build/