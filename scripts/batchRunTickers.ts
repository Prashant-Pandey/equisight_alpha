#!/usr/bin/env tsx

/**
 * batchRunTickers.ts
 *
 * Executes the 5-step automated report refresh pipeline:
 *  1. Create a list of all tickers and the date of report whose report is already generated.
 *  2. Filter out all the tickers whose report is generated within past 5 days.
 *  3. Create another list containing those tickers in batches of 20.
 *  4. Run `pipeline:run:tickers` commands on each batch of 20 with `--ignore-lockout` (skipping trailing 12-month lockout), parallelizing 2 batches at a time.
 *  5. Once all batches are processed, run git commit and git push.
 *
 * Usage:
 *   npx tsx scripts/batchRunTickers.ts [options]
 *   npm run pipeline:batch:old-tickers
 *
 * Options:
 *   --dry-run             Simulate steps 1-3 without running pipeline or committing to git.
 *   --cutoff-days=<n>     Days threshold to filter out fresh reports (default: 5).
 *   --batch-size=<n>      Batch size of tickers (default: 20).
 *   --concurrency=<n>     Number of parallel batches to execute (default: 2).
 *   --skip-git            Skip git commit and git push at the end.
 *   --commit-msg="<msg>"  Custom git commit message.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { spawn, execSync, type ChildProcess } from 'child_process';

interface TickerReportInfo {
  ticker: string;
  latestReportDate: Date;
  latestReportDateStr: string;
  sourceFile?: string;
}

interface CliOptions {
  dryRun: boolean;
  cutoffDays: number;
  batchSize: number;
  concurrency: number;
  skipGit: boolean;
  commitMessage?: string;
}

// Global process tracking for graceful interrupt handling
const activeChildProcesses = new Set<ChildProcess>();

function setupProcessSignalHandlers(): void {
  const cleanExit = (signal: string) => {
    console.log(`\n[Process] Caught ${signal}. Terminating all active batch child processes...`);
    for (const child of activeChildProcesses) {
      try {
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      } catch {}
    }
    process.exit(130);
  };

  process.once('SIGINT', () => cleanExit('SIGINT'));
  process.once('SIGTERM', () => cleanExit('SIGTERM'));
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: argv.includes('--dry-run'),
    cutoffDays: 5,
    batchSize: 20,
    concurrency: 2,
    skipGit: argv.includes('--skip-git')
  };

  for (const arg of argv) {
    if (arg.startsWith('--cutoff-days=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val >= 0) options.cutoffDays = val;
    } else if (arg.startsWith('--batch-size=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) options.batchSize = val;
    } else if (arg.startsWith('--concurrency=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) options.concurrency = val;
    } else if (arg.startsWith('--commit-msg=')) {
      options.commitMessage = arg.slice('--commit-msg='.length).replace(/^["']|["']$/g, '');
    }
  }

  return options;
}

// ============================================================================
// STEP 1: Create a list of all tickers and the date of report, whose report is
//         already generated.
// ============================================================================
export function step1_createGeneratedTickersList(
  projectRoot = process.cwd()
): TickerReportInfo[] {
  console.log('\n================================================================================');
  console.log('STEP 1: Compiling list of tickers and report dates for already generated reports');
  console.log('================================================================================');

  const reportsDir = path.resolve(projectRoot, 'src/content/reports');
  const historyFile = path.resolve(projectRoot, 'pipeline/data/coverage-history.json');
  const tickerMap = new Map<string, TickerReportInfo>();

  // 1. Scan src/content/reports markdown files
  if (fs.existsSync(reportsDir)) {
    const reportFiles = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.md'));
    console.log(`[Step 1] Found ${reportFiles.length} report files in ${reportsDir}`);

    for (const file of reportFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = matter(fileContent);

        // Derive ticker
        let ticker = (parsed.data.ticker || '').toString().trim().toUpperCase();
        if (!ticker) {
          const match = file.match(/^\d{4}-\d{2}-\d{2}-([a-zA-Z0-9]+)-/);
          if (match) ticker = match[1].toUpperCase();
        }

        // Derive date
        let dateVal = parsed.data.publishDate;
        if (!dateVal) {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) dateVal = match[1];
        }

        if (ticker && dateVal) {
          const dateObj = new Date(dateVal);
          if (!isNaN(dateObj.getTime())) {
            const existing = tickerMap.get(ticker);
            if (!existing || dateObj.getTime() > existing.latestReportDate.getTime()) {
              tickerMap.set(ticker, {
                ticker,
                latestReportDate: dateObj,
                latestReportDateStr: dateObj.toISOString(),
                sourceFile: file
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Step 1] Warning: Failed parsing ${file}: ${err.message}`);
      }
    }
  } else {
    console.warn(`[Step 1] Reports directory ${reportsDir} not found.`);
  }

  // 2. Cross-reference coverage-history.json for any additional recorded entries
  if (fs.existsSync(historyFile)) {
    try {
      const historyRaw = fs.readFileSync(historyFile, 'utf-8');
      const historyList = JSON.parse(historyRaw);
      if (Array.isArray(historyList)) {
        for (const item of historyList) {
          const sym = (item.ticker || '').toString().trim().toUpperCase();
          const coveredAt = item.coveredAt;
          if (sym && coveredAt) {
            const dateObj = new Date(coveredAt);
            if (!isNaN(dateObj.getTime())) {
              const existing = tickerMap.get(sym);
              if (!existing || dateObj.getTime() > existing.latestReportDate.getTime()) {
                tickerMap.set(sym, {
                  ticker: sym,
                  latestReportDate: dateObj,
                  latestReportDateStr: dateObj.toISOString(),
                  sourceFile: existing?.sourceFile || 'pipeline/data/coverage-history.json'
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Step 1] Warning: Failed reading coverage-history.json: ${err.message}`);
    }
  }

  const reportsList = Array.from(tickerMap.values()).sort((a, b) =>
    a.ticker.localeCompare(b.ticker)
  );

  console.log(`[Step 1] Generated list containing ${reportsList.length} unique tickers with existing reports.`);

  // Print sample / summary table
  const sample = reportsList.slice(0, 10);
  console.log('[Step 1] First 10 tickers in generated list:');
  for (const item of sample) {
    console.log(`  - ${item.ticker.padEnd(6)} | Report Date: ${item.latestReportDateStr.slice(0, 10)}`);
  }
  if (reportsList.length > 10) {
    console.log(`  ... and ${reportsList.length - 10} more tickers.`);
  }

  return reportsList;
}

// ============================================================================
// STEP 2: Filter out all the tickers whose report is generated within past 5 days.
// ============================================================================
export function step2_filterRecentReports(
  allReports: TickerReportInfo[],
  cutoffDays = 5,
  currentDate = new Date()
): { eligibleTickers: string[]; filteredOutCount: number } {
  console.log('\n================================================================================');
  console.log(`STEP 2: Filter out tickers whose report was generated within past ${cutoffDays} days`);
  console.log(`Reference Date: ${currentDate.toISOString()}`);
  console.log('================================================================================');

  const eligible: TickerReportInfo[] = [];
  const filteredOut: { ticker: string; dateStr: string; elapsedDays: number }[] = [];

  for (const item of allReports) {
    const elapsedMs = currentDate.getTime() - item.latestReportDate.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    if (elapsedDays <= cutoffDays) {
      // Generated within past 5 days -> filter out
      filteredOut.push({
        ticker: item.ticker,
        dateStr: item.latestReportDateStr.slice(0, 10),
        elapsedDays: Math.round(elapsedDays * 10) / 10
      });
    } else {
      // Older than 5 days -> keep for refresh
      eligible.push(item);
    }
  }

  console.log(`[Step 2] Note: Trailing 12-month lockout is intentionally bypassed (--ignore-lockout).`);
  console.log(`[Step 2] Total tickers evaluated: ${allReports.length}`);
  console.log(`[Step 2] Filtered OUT (generated within last ${cutoffDays} days): ${filteredOut.length} tickers`);
  console.log(`[Step 2] KEPT for execution (older than ${cutoffDays} days): ${eligible.length} tickers`);

  if (filteredOut.length > 0) {
    console.log('[Step 2] Sample of filtered-out tickers (recent):');
    for (const f of filteredOut.slice(0, 6)) {
      console.log(`  - ${f.ticker.padEnd(6)} (Report: ${f.dateStr}, ${f.elapsedDays}d ago)`);
    }
    if (filteredOut.length > 6) {
      console.log(`  ... and ${filteredOut.length - 6} more filtered out.`);
    }
  }

  const eligibleTickers = eligible.map((e) => e.ticker);
  return {
    eligibleTickers,
    filteredOutCount: filteredOut.length
  };
}

// ============================================================================
// STEP 3: Create another list containing those tickers in the batch of 20.
// ============================================================================
export function step3_createBatches(
  tickers: string[],
  batchSize = 20
): string[][] {
  console.log('\n================================================================================');
  console.log(`STEP 3: Chunking ${tickers.length} tickers into batches of ${batchSize}`);
  console.log('================================================================================');

  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += batchSize) {
    batches.push(tickers.slice(i, i + batchSize));
  }

  console.log(`[Step 3] Created ${batches.length} batches:`);
  batches.forEach((batch, idx) => {
    console.log(`  Batch ${idx + 1} (${batch.length} tickers): [${batch.join(', ')}]`);
  });

  return batches;
}

// ============================================================================
// STEP 4: Run pipeline:run:tickers commands on each batch of 20,
//         parallelize the calls with 2 batches at a time.
// ============================================================================
async function executeSingleBatch(
  batchNumber: number,
  totalBatches: number,
  batchTickers: string[],
  projectRoot: string,
  isDryRun: boolean
): Promise<{ batchNumber: number; success: boolean; error?: string }> {
  const batchLabel = `[Batch ${batchNumber}/${totalBatches}]`;
  const tickersArg = batchTickers.join(' ');

  console.log(`\n${batchLabel} >>> Starting pipeline run for ${batchTickers.length} tickers: ${tickersArg}`);

  if (isDryRun) {
    console.log(`${batchLabel} [DRY-RUN] Simulating execution: npm run pipeline:run:tickers -- ${tickersArg} --ignore-lockout`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`${batchLabel} [DRY-RUN] Finished simulated batch execution.`);
    return { batchNumber, success: true };
  }

  return new Promise((resolve) => {
    const startTime = Date.now();

    // Disable AUTO_TRIGGER_DEPLOY in child processes so batches don't concurrently git commit/push.
    // The master script will perform a single unified git commit and push in Step 5.
    // Pass --ignore-lockout to explicitly bypass trailing 12-month lockout for targeted refresh.
    const child = spawn(
      'npm',
      ['run', 'pipeline:run:tickers', '--', ...batchTickers, '--ignore-lockout'],
      {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          AUTO_TRIGGER_DEPLOY: 'false',
          IGNORE_LOCKOUT: 'true'
        }
      }
    );

    activeChildProcesses.add(child);

    child.on('error', (err) => {
      activeChildProcesses.delete(child);
      console.error(`${batchLabel} ✗ Process spawn error: ${err.message}`);
      resolve({ batchNumber, success: false, error: err.message });
    });

    child.on('close', (code) => {
      activeChildProcesses.delete(child);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`${batchLabel} ✓ Completed successfully in ${elapsedSec}s.`);
        resolve({ batchNumber, success: true });
      } else {
        console.error(`${batchLabel} ✗ Process exited with error code ${code} in ${elapsedSec}s.`);
        resolve({ batchNumber, success: false, error: `Exited with code ${code}` });
      }
    });
  });
}

export async function step4_executeBatchesParallel(
  batches: string[][],
  concurrency = 2,
  projectRoot = process.cwd(),
  isDryRun = false
): Promise<{ successfulBatches: number; failedBatches: number }> {
  console.log('\n================================================================================');
  console.log(`STEP 4: Running pipeline:run:tickers with parallel concurrency = ${concurrency}`);
  console.log('================================================================================');

  if (batches.length === 0) {
    console.log('[Step 4] No batches to execute.');
    return { successfulBatches: 0, failedBatches: 0 };
  }

  const results: { batchNumber: number; success: boolean; error?: string }[] = [];
  let nextBatchIndex = 0;

  // Active concurrency pool worker
  const runWorker = async (workerId: number): Promise<void> => {
    while (nextBatchIndex < batches.length) {
      const currentIndex = nextBatchIndex++;
      const batchNum = currentIndex + 1;
      const batchTickers = batches[currentIndex];

      console.log(`[Worker ${workerId}] Assigned Batch ${batchNum}/${batches.length}`);
      const res = await executeSingleBatch(
        batchNum,
        batches.length,
        batchTickers,
        projectRoot,
        isDryRun
      );
      results.push(res);
    }
  };

  const poolSize = Math.min(concurrency, batches.length);
  console.log(`[Step 4] Spawning worker pool of size ${poolSize}...`);
  const workerPromises = Array.from({ length: poolSize }, (_, idx) => runWorker(idx + 1));
  await Promise.all(workerPromises);

  const successfulBatches = results.filter((r) => r.success).length;
  const failedBatches = results.filter((r) => !r.success).length;

  console.log('\n================================================================================');
  console.log(`[Step 4] Execution Concluded: ${successfulBatches}/${batches.length} batches succeeded, ${failedBatches} failed.`);
  console.log('================================================================================');

  return { successfulBatches, failedBatches };
}

// ============================================================================
// STEP 5: Once all the batches are processed, then run git commit and git push.
// ============================================================================
export async function step5_gitCommitAndPush(
  totalTickersCount: number,
  projectRoot = process.cwd(),
  options?: { isDryRun?: boolean; skipGit?: boolean; customCommitMessage?: string }
): Promise<boolean> {
  console.log('\n================================================================================');
  console.log('STEP 5: Git commit and git push');
  console.log('================================================================================');

  if (options?.skipGit) {
    console.log('[Step 5] --skip-git specified. Skipping git commit and push.');
    return true;
  }

  if (options?.isDryRun) {
    console.log('[Step 5] [DRY-RUN] Simulating: git add -A, git commit, and git push.');
    return true;
  }

  try {
    // 1. Check if git repository is clean or dirty
    const statusOutput = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf-8'
    }).trim();

    if (!statusOutput) {
      console.log('[Step 5] Git working tree is completely clean. No changes to commit.');
      return true;
    }

    console.log('[Step 5] Detected modified/new files:');
    const statusLines = statusOutput.split('\n');
    for (const line of statusLines.slice(0, 10)) {
      console.log(`  ${line}`);
    }
    if (statusLines.length > 10) {
      console.log(`  ... and ${statusLines.length - 10} more files.`);
    }

    // 2. Stage all modifications
    console.log('[Step 5] Staging files with "git add -A"...');
    execSync('git add -A', { cwd: projectRoot, stdio: 'inherit' });

    // 3. Commit staged files
    const todayStr = new Date().toISOString().split('T')[0];
    const commitMsg =
      options?.customCommitMessage ||
      `chore(reports): batch refresh equity analysis for ${totalTickersCount} tickers [${todayStr}]`;

    console.log(`[Step 5] Committing changes with message: "${commitMsg}"...`);
    execSync(`git commit -m ${JSON.stringify(commitMsg)}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    // 4. Push committed changes to remote repository
    console.log('[Step 5] Pushing changes to remote ("git push")...');
    execSync('git push', { cwd: projectRoot, stdio: 'inherit' });

    console.log('[Step 5] ✓ Successfully committed and pushed batch report updates.');
    return true;
  } catch (gitErr: any) {
    console.error(`[Step 5] ✗ Git commit/push failed: ${gitErr.message}`);
    return false;
  }
}

// ============================================================================
// MAIN ORCHESTRATION PIPELINE
// ============================================================================
export async function runBatchPipeline(): Promise<void> {
  setupProcessSignalHandlers();

  const options = parseCliOptions(process.argv.slice(2));
  const startTime = Date.now();

  console.log('################################################################################');
  console.log('#                 EQUISIGHT BATCH REPORT REFRESH ORCHESTRATOR                  #');
  console.log('################################################################################');
  console.log(`Config: Cutoff=${options.cutoffDays} days | BatchSize=${options.batchSize} | Concurrency=${options.concurrency} | DryRun=${options.dryRun}`);

  // Step 1: Create list of all tickers and date of report
  const allReports = step1_createGeneratedTickersList();

  // Step 2: Filter out tickers whose report was generated within past 5 days
  const { eligibleTickers } = step2_filterRecentReports(allReports, options.cutoffDays);

  if (eligibleTickers.length === 0) {
    console.log('\n[Notice] No tickers require updates (all existing reports are within the cutoff window). Exiting.');
    return;
  }

  // Step 3: Create another list containing those tickers in batches of 20
  const batches = step3_createBatches(eligibleTickers, options.batchSize);

  // Step 4: Run pipeline:run:tickers commands on each batch of 20, 2 batches in parallel
  const executionSummary = await step4_executeBatchesParallel(
    batches,
    options.concurrency,
    process.cwd(),
    options.dryRun
  );

  // Step 5: Once all batches are processed, run git commit and git push
  await step5_gitCommitAndPush(eligibleTickers.length, process.cwd(), {
    isDryRun: options.dryRun,
    skipGit: options.skipGit,
    customCommitMessage: options.commitMessage
  });

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n################################################################################');
  console.log(`✓ ALL 5 STEPS COMPLETED IN ${totalSec}s`);
  console.log(`  - Total tickers updated: ${eligibleTickers.length}`);
  console.log(`  - Batches completed: ${executionSummary.successfulBatches}/${batches.length}`);
  console.log('################################################################################\n');
}

// Direct CLI Invocation
const isDirectExecution =
  process.argv[1]?.includes('batchRunTickers') ||
  process.argv[1]?.includes('batchRunTickers.ts');

if (isDirectExecution) {
  runBatchPipeline().catch((err) => {
    console.error('Fatal batch pipeline error:', err);
    process.exit(1);
  });
}
