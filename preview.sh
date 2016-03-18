#!/bin/bash
set -o errexit # Exit on error

rm -rf .cache/

NODE_ENV=production MARKO_CLEAN=true npm run build --silent
npm run http-server