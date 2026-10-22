#!/bin/sh
set -eu
mkdir -p /tmp/hca-verification
tar -C /workspace --exclude=.git --exclude=.vercel --exclude=.temp --exclude=.branches --exclude=node_modules --exclude='.env*' --exclude='.next*' --exclude=test-results --exclude=playwright-report --exclude=output --exclude='*.tsbuildinfo' -cf - . | tar -C /tmp/hca-verification -xf -
cd /tmp/hca-verification
npm install --global npm@11.21.1 --no-audit --no-fund
node --version
npm --version
npm ci --no-audit --no-fund
status=0
run_check() {
  name=$1
  shift
  if "$@"; then
    printf 'HCA_CHECK %s PASS\n' "$name"
  else
    result=$?
    printf 'HCA_CHECK %s FAIL %s\n' "$name" "$result"
    status=1
  fi
}
run_check dependency-tree npm ls --all --omit=optional
run_check contracts npm run check:contracts
run_check lint npm run lint
run_check markdown npm run lint:markdown
run_check typecheck npm run typecheck
run_check unit npm test
run_check build npm run build
exit "$status"
