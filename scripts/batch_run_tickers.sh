#!/usr/bin/env bash

# batch_run_tickers.sh
# Shell script to invoke the 5-step batch report refresh pipeline.
#
# Steps performed in exact chronology:
#   1. Create list of all tickers and report dates whose reports are already generated.
#   2. Filter out tickers generated within past 5 days.
#   3. Create another list containing those tickers in batches of 20.
#   4. Run `pipeline:run:tickers` on each batch of 20 with `--ignore-lockout` (skipping trailing 12-month lockout), parallelized 2 batches at a time.
#   5. Once all batches are processed, run git commit and git push.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

npx tsx scripts/batchRunTickers.ts "$@"
