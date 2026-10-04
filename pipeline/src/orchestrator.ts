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
  public async runExecutionCycle(cycleName = 'MANUAL_TRIGGER'): Promise<void> {
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
      // 1. Ingest Market Movers and Penny Stocks, applying 12-Month Lockout Filter
      const { gainers, losers, pennyStocks } = await marketMoverIngestor.getEligibleMovers({ includePennyStocks: true });
      const targetMovers: MarketMover[] = [
        ...gainers,
        ...losers,
        ...(pennyStocks ? [...pennyStocks.gainers, ...pennyStocks.losers] : [])
      ];

      console.log(`[PipelineOrchestrator] Target movers queue established: ${targetMovers.length} equities (${gainers.length} gainers, ${losers.length} losers${pennyStocks ? `, ${pennyStocks.gainers.length + pennyStocks.losers.length} penny stocks` : ''})`);

      // 2. Ingest Global Macro Context
      const macroBackdrop = await macroContextIngestor.getMacroBackdrop();

      // 3. Process each equity with isolated failover boundaries
      for (let i = 0; i < targetMovers.length; i++) {
        const mover = targetMovers[i];
        console.log(`\n--- [Processing ${i + 1}/${targetMovers.length}: $${mover.ticker} (${mover.category.toUpperCase()}${mover.isPennyStock ? ' - PENNY STOCK' : ''})] ---`);

        try {
          // A. Ingest Fundamentals
          const fundamentals = await fundamentalDataIngestor.getFundamentals(mover.ticker, mover.name);

          // B. Ingest Social Sentiment & Web Intelligence with Artificial Inflation Analysis
          const sentiment = await socialSentimentIngestor.getSentiment(mover.ticker, mover.category, mover.name, mover);

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

// CLI Execution Support:
// Run with "tsx pipeline/src/orchestrator.ts --run-now" for an immediate one-off cycle.
// Run with "tsx pipeline/src/orchestrator.ts" to start the continuous cron daemon in the background.
// Run with "tsx pipeline/src/orchestrator.ts --foreground" to run in the foreground.
// Run with "tsx pipeline/src/orchestrator.ts --stop" to stop running cron daemons.
if (process.argv.includes('--run-now')) {
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
