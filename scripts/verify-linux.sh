#!/bin/sh
set -eu
mkdir -p /tmp/hca-verification
# One selection contract for verification and its synthetic sentinel test.
hca_archive=$(mktemp /tmp/hca-export.XXXXXX.tar)
trap 'rm -f -- "$hca_archive"' EXIT HUP INT TERM
# Separate commands preserve failure of the producer under POSIX sh; a pipe
# could otherwise report success after extracting an incomplete export.
tar -C /workspace -X /workspace/scripts/verification-export.exclude -cf "$hca_archive" .
tar -C /tmp/hca-verification -xf "$hca_archive"
rm -f -- "$hca_archive"
trap - EXIT HUP INT TERM
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
