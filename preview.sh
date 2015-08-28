#!/bin/bash
set -o errexit # Exit on error

NODE_ENV=production npm run build --silent
npm run http-server