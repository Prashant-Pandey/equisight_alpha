import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { marketMoverIngestor } from './ingestion/marketMovers.js';
import { fundamentalDataIngestor } from './ingestion/fundamentalData.js';
import { macroContextIngestor } from './ingestion/macroContext.js';
import { socialSentimentIngestor } from './ingestion/socialSentiment.js';
import { synthesisAgent } from './llm/synthesisAgent.js';
import { adInjector } from './monetization/adInjector.js';
import { reportGenerator } from './storage/reportGenerator.js';
import { socialPublisher } from './distribution/socialPublisher.js';
import { buildAndDeployManager } from './deploy/buildAndDeploy.js';
import { historyTracker } from './storage/historyTracker.js';
import type { MarketMover } from './types.js';

export class PipelineOrchestrator {
  private isRunning = false;
  private cronTasks: cron.ScheduledTask[] = [];

  /**
   * Initializes the cron scheduler for twice-daily automated execution.
   */
  public startCron(): void {
    console.log('================================================================');
    console.log(`[PipelineOrchestrator] Starting ${CONFIG.PLATFORM_NAME} Automation Engine`);
    console.log(`[Config] Lockout Window: ${CONFIG.COVERAGE_LOCKOUT_DAYS} days (Trailing 12-Month Rule)`);
    console.log(`[Config] Target Daily Output: ${CONFIG.DAILY_REPORTS_TOTAL} Reports (5 Gainers, 5 Losers)`);
    console.log(`[Scheduler] Pre-market Cron: ${CONFIG.CRON_SCHEDULE_PREMARKET || '0 7 * * 1-5'}`);
    console.log(`[Scheduler] Post-market Cron: ${CONFIG.CRON_SCHEDULE_POSTMARKET || '30 16 * * 1-5'}`);
    console.log(`[Scheduler] Active Locked-out Tickers: ${historyTracker.getLockedCount()}`);
    console.log('================================================================');

    // Register active PID for external daemon stop commands
    this.writePidFile();
    this.setupSignalHandlers();

    // Morning Pre-Market Execution (07:00 AM EST)
    const preMarketTask = cron.schedule(CONFIG.CRON_SCHEDULE_PREMARKET || '0 7 * * 1-5', async () => {
      console.log('\n[CRON] Firing Pre-Market Execution Cycle...');
      await this.runExecutionCycle('PRE_MARKET');
    }, { timezone: 'America/New_York' });
    this.cronTasks.push(preMarketTask);

    // Afternoon Post-Market Execution (16:30 PM EST)
    const postMarketTask = cron.schedule(CONFIG.CRON_SCHEDULE_POSTMARKET || '30 16 * * 1-5', async () => {
      console.log('\n[CRON] Firing Post-Market Execution Cycle...');
      await this.runExecutionCycle('POST_MARKET');
    }, { timezone: 'America/New_York' });
    this.cronTasks.push(postMarketTask);

    console.log(`[PipelineOrchestrator] Cron daemon active and listening (PID: ${process.pid}). Run "npm run pipeline:stop_cron" or press Ctrl+C to stop.`);
  }

  /**
   * Stops active internal cron tasks and cleans up the PID file.
   */
  public stopCron(): void {
    for (const task of this.cronTasks) {
      task.stop();
    }
    this.cronTasks = [];
    this.removePidFile();
    console.log('[PipelineOrchestrator] Cron daemon stopped.');
  }

  private writePidFile(): void {
    try {
      const pidDir = path.dirname(CONFIG.CRON_PID_FILE);
      if (!fs.existsSync(pidDir)) {
        fs.mkdirSync(pidDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG.CRON_PID_FILE, process.pid.toString(), 'utf-8');
    } catch (err: any) {
      console.warn(`[PipelineOrchestrator] Warning: Unable to write PID file: ${err.message}`);
    }
  }

  private removePidFile(): void {
    try {
      if (fs.existsSync(CONFIG.CRON_PID_FILE)) {
        const savedPid = parseInt(fs.readFileSync(CONFIG.CRON_PID_FILE, 'utf-8').trim(), 10);
        if (savedPid === process.pid) {
          fs.unlinkSync(CONFIG.CRON_PID_FILE);
        }
      }
    } catch {}
  }

  private setupSignalHandlers(): void {
    const handleShutdown = () => {
      this.removePidFile();
      process.exit(0);
    };
    process.once('SIGINT', handleShutdown);
    process.once('SIGTERM', handleShutdown);
    process.once('exit', () => this.removePidFile());
  }

  /**
   * Executes a full operational cycle:
   * 1. Ingest movers & filter 12-month lockouts
   * 2. Ingest fundamentals & macro
   * 3. Synthesize & fact-check with LLM
   * 4. Inject affiliate monetization & ads
   * 5. Generate Markdown reports
   * 6. Trigger static build & deploy
   * 7. Distribute to social channels
   */
  public async runExecutionCycle(
    cycleName = 'MANUAL_TRIGGER',
    options: { specificTickers?: string[] } = {}
  ): Promise<void> {
    if (this.isRunning) {
      console.warn(`[PipelineOrchestrator] Cycle ${cycleName} skipped: Previous cycle is still actively processing.`);
      return;
    }

    this.isRunning = true;
    const cycleStartTime = Date.now();
    console.log(`\n================== [CYCLE START: ${cycleName}] ==================`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const publishedReports: { ticker: string; slug: string; path: string }[] = [];

    try {
      let targetMovers: MarketMover[] = [];

      if (options.specificTickers && options.specificTickers.length > 0) {
        console.log(`[PipelineOrchestrator] Targeted ticker execution mode: [${options.specificTickers.join(', ')}]`);
        for (const rawTicker of options.specificTickers) {
          try {
            const mover = await marketMoverIngestor.getMoverForTicker(rawTicker);
            if (!historyTracker.isEligible(mover.ticker)) {
              console.log(`[PipelineOrchestrator] Notice: $${mover.ticker} was covered within trailing 12-month lockout. Processing explicitly requested ticker.`);
            }
            targetMovers.push(mover);
          } catch (fetchErr: any) {
            console.error(`✗ [PipelineOrchestrator] Could not load ticker $${rawTicker}: ${fetchErr.message}`);
          }
        }

        if (targetMovers.length === 0) {
          console.error('[PipelineOrchestrator] No valid tickers available to process. Aborting cycle.');
          return;
        }

        console.log(`[PipelineOrchestrator] Target movers queue established: ${targetMovers.length} targeted equities (${targetMovers.map(m => `$${m.ticker}`).join(', ')})`);
      } else {
        // 1. Ingest Market Movers and Penny Stocks, applying 12-Month Lockout Filter
        const { gainers, losers, pennyStocks } = await marketMoverIngestor.getEligibleMovers({ includePennyStocks: true });
        targetMovers = [
          ...gainers,
          ...losers,
          ...(pennyStocks ? [...pennyStocks.gainers, ...pennyStocks.losers] : [])
        ];

        console.log(`[PipelineOrchestrator] Target movers queue established: ${targetMovers.length} equities (${gainers.length} gainers, ${losers.length} losers${pennyStocks ? `, ${pennyStocks.gainers.length + pennyStocks.losers.length} penny stocks` : ''})`);
      }

      // 2. Ingest Global Macro Context
      const macroBackdrop = await macroContextIngestor.getMacroBackdrop();

      // 3. Process each equity with isolated failover boundaries
      for (let i = 0; i < targetMovers.length; i++) {
        const mover = targetMovers[i];
        console.log(`\n--- [Processing ${i + 1}/${targetMovers.length}: $${mover.ticker} (${mover.category.toUpperCase()}${mover.isPennyStock ? ' - PENNY STOCK' : ''})] ---`);

        try {
          // A. Ingest Fundamentals
          const fundamentals = await fundamentalDataIngestor.getFundamentals(mover.ticker, mover.name, macroBackdrop);

          // B. Ingest Social Sentiment & Web Intelligence with Artificial Inflation Analysis (Gamma & Float)
          const sentiment = await socialSentimentIngestor.getSentiment(mover.ticker, mover.category, mover.name, mover, fundamentals);

          // C. LLM Multi-Agent Synthesis & Anti-Hallucination Fact-Checking
          const analysis = await synthesisAgent.generateReport(mover, fundamentals, macroBackdrop, sentiment);

          // D. Programmatic Affiliate & Ad Injection
          const { frontmatter, enrichedMarkdown } = adInjector.injectMonetization(mover, fundamentals, analysis, sentiment);

          // E. Save Astro Content Collection Report & Update 12-Month Lockout
          const savedPath = await reportGenerator.saveReport(mover, analysis.slug, frontmatter, enrichedMarkdown);

          // F. Social Multi-Channel Distribution
          await socialPublisher.distributeReport(savedPath, frontmatter, analysis.slug);

          publishedReports.push({
            ticker: mover.ticker,
            slug: analysis.slug,
            path: savedPath
          });

          console.log(`✓ [Success] Completed processing for $${mover.ticker}`);
        } catch (itemError: any) {
          // Individual failure does NOT halt the remaining reports
          console.error(`✗ [Item Failed] Error generating report for $${mover.ticker}: ${itemError.message}`);
        }
      }

      console.log(`\n[PipelineOrchestrator] Batch processing concluded. Generated ${publishedReports.length} / ${targetMovers.length} reports.`);

      // 4. Trigger Astro Static Build & Deployment
      if (publishedReports.length > 0) {
        console.log('[PipelineOrchestrator] Triggering static build compilation...');
        const tickers = publishedReports.map((r) => `$${r.ticker}`).join(', ');
        const commitMsg = `chore(deploy): auto-publish ${publishedReports.length} reports (${tickers}) [${new Date().toISOString().split('T')[0]}]`;
        const buildResult = await buildAndDeployManager.executeBuildAndDeploy(commitMsg);
        if (buildResult.success) {
          console.log(`[PipelineOrchestrator] Build succeeded (${buildResult.pagesBuilt} pages). Deploy triggered: ${buildResult.deployTriggered}`);
        } else {
          console.error(`[PipelineOrchestrator] Build failed: ${buildResult.error}`);
        }
      }

      const elapsedSeconds = ((Date.now() - cycleStartTime) / 1000).toFixed(1);
      console.log(`================== [CYCLE COMPLETED: ${cycleName} in ${elapsedSeconds}s] ==================\n`);
    } catch (globalError: any) {
      console.error(`[PipelineOrchestrator] Fatal error during cycle ${cycleName}:`, globalError);
    } finally {
      this.isRunning = false;
    }
  }
}

export const orchestrator = new PipelineOrchestrator();

/**
 * Parses ticker symbols from command-line arguments.
 * Supports:
 *   --tickers AAPL MSFT NVDA
 *   --tickers [AAPL, MSFT]
 *   --tickers "[AAPL, MSFT]"
 *   --tickers AAPL,MSFT
 *   --tickers=AAPL,MSFT
 *   --ticker AAPL
 */
export function parseTickersFromArgv(argv: string[]): string[] {
  const tickers: string[] = [];

  // Check for inline assignment: --tickers=... or --ticker=...
  const inlineMatch = argv.find((a) => a.startsWith('--tickers=') || a.startsWith('--ticker='));
  if (inlineMatch) {
    const val = inlineMatch.split('=').slice(1).join('=');
    const cleaned = val.replace(/[\[\]"',]/g, ' ').split(/\s+/);
    for (const token of cleaned) {
      const sym = token.trim().toUpperCase();
      if (sym && !sym.startsWith('-')) tickers.push(sym);
    }
    return [...new Set(tickers)];
  }

  // Check for flag followed by arguments: --tickers <sym1> <sym2> ...
  const tickerFlagIdx = argv.findIndex((a) => a === '--tickers' || a === '--ticker');
  const rawArgs = tickerFlagIdx !== -1 ? argv.slice(tickerFlagIdx + 1) : [];

  for (const raw of rawArgs) {
    if (raw.startsWith('--')) break; // Stop if another option flag is reached
    const cleaned = raw.replace(/[\[\]"',]/g, ' ').split(/\s+/);
    for (const token of cleaned) {
      const sym = token.trim().toUpperCase();
      if (sym && !sym.startsWith('-')) {
        tickers.push(sym);
      }
    }
  }

  return [...new Set(tickers)];
}

// CLI Execution Support:
// Run with "tsx pipeline/src/orchestrator.ts --tickers <SYMBOL1> <SYMBOL2>" for targeted equities.
// Run with "tsx pipeline/src/orchestrator.ts --run-now" for an immediate one-off cycle.
// Run with "tsx pipeline/src/orchestrator.ts" to start the continuous cron daemon in the background.
// Run with "tsx pipeline/src/orchestrator.ts --foreground" to run in the foreground.
// Run with "tsx pipeline/src/orchestrator.ts --stop" to stop running cron daemons.
const hasTickersFlag = process.argv.includes('--tickers') ||
  process.argv.includes('--ticker') ||
  process.argv.some((a) => a.startsWith('--tickers=') || a.startsWith('--ticker='));

if (hasTickersFlag) {
  const tickers = parseTickersFromArgv(process.argv);
  if (tickers.length === 0) {
    console.error('\n[CLI] Error: No ticker symbols provided for targeted run.');
    console.error('Usage: npm run pipeline:run:tickers <SYMBOL1> <SYMBOL2> ...');
    console.error('Examples:');
    console.error('  npm run pipeline:run:tickers AAPL MSFT');
    console.error('  npm run pipeline:run:tickers "[AAPL, MSFT]"');
    console.error('  npm run pipeline:run:tickers AAPL,MSFT');
    process.exit(1);
  }

  console.log(`[CLI] Detected targeted ticker run for symbols: [${tickers.join(', ')}]. Executing targeted cycle...`);
  orchestrator.runExecutionCycle('CLI_TARGETED_TICKERS', { specificTickers: tickers }).then(() => {
    console.log('[CLI] Targeted execution cycle finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('[CLI] Unhandled error during targeted CLI execution:', err);
    process.exit(1);
  });
} else if (process.argv.includes('--run-now')) {
  console.log('[CLI] Detected --run-now argument. Executing immediate cycle...');
  orchestrator.runExecutionCycle('CLI_RUN_NOW').then(() => {
    console.log('[CLI] Execution cycle finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('[CLI] Unhandled error during CLI execution:', err);
    process.exit(1);
  });
} else if (process.argv.includes('--stop') || process.argv.includes('--stop-cron')) {
  import('./stopCron.js').then(({ stopRunningCronJobs }) => {
    stopRunningCronJobs().then((res) => {
      process.exit(res.success ? 0 : 1);
    }).catch((err) => {
      console.error('[CLI] Unhandled error stopping cron daemon:', err);
      process.exit(1);
    });
  });
} else if (process.argv.includes('--foreground') || process.env.CRON_DAEMON === 'true') {
  orchestrator.startCron();
} else if (process.argv[1]?.includes('orchestrator')) {
  import('./startCron.js').then(({ startCronDaemon }) => {
    startCronDaemon().then((res) => {
      process.exit(res.success ? 0 : 1);
    }).catch((err) => {
      console.error('[CLI] Error starting cron daemon:', err);
      process.exit(1);
    });
  });
}
