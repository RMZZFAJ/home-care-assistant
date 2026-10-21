#!/bin/sh
set -eu
mkdir -p /tmp/hca-verification
tar -C /workspace --exclude=.git --exclude=.vercel --exclude=.temp --exclude=.branches --exclude=node_modules --exclude='.env*' --exclude='.next*' --exclude=test-results --exclude=playwright-report --exclude=output --exclude='*.tsbuildinfo' -cf - . | tar -C /tmp/hca-verification -xf -
cd /tmp/hca-verification
npm install --global npm@11.21.1 --no-audit --no-fund
node --version
npm --version
npm ci --no-audit --no-fund
npm run check:contracts
npm run lint
npm run lint:markdown
npm run typecheck
npm test
npm run build
