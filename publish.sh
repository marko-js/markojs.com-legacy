#!/bin/bash
set -o errexit # Exit on error

TARGET_DIR="../marko-js.github.io"
TARGET_DIR=`(cd $TARGET_DIR; pwd)`

./push-all.sh

# Rebuild the site
NODE_ENV=production npm run build --silent

rm -rf ./cache/

rm -rf $TARGET_DIR/*
cp -r build/ $TARGET_DIR/

cd $TARGET_DIR
git add . --all
git commit -a -m "Updated website"
git push origin master