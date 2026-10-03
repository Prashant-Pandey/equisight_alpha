import cron from 'node-cron';
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

    // Morning Pre-Market Execution (07:00 AM EST)
    cron.schedule(CONFIG.CRON_SCHEDULE_PREMARKET || '0 7 * * 1-5', async () => {
      console.log('\n[CRON] Firing Pre-Market Execution Cycle...');
      await this.runExecutionCycle('PRE_MARKET');
    }, { timezone: 'America/New_York' });

    // Afternoon Post-Market Execution (16:30 PM EST)
    cron.schedule(CONFIG.CRON_SCHEDULE_POSTMARKET || '30 16 * * 1-5', async () => {
      console.log('\n[CRON] Firing Post-Market Execution Cycle...');
      await this.runExecutionCycle('POST_MARKET');
    }, { timezone: 'America/New_York' });

    console.log('[PipelineOrchestrator] Cron daemon active and listening. Press Ctrl+C to stop.');
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
      // 1. Ingest Market Movers and apply 12-Month Lockout Filter
      const { gainers, losers } = await marketMoverIngestor.getEligibleMovers();
      const targetMovers: MarketMover[] = [...gainers, ...losers];

      console.log(`[PipelineOrchestrator] Target movers queue established: ${targetMovers.length} equities`);

      // 2. Ingest Global Macro Context
      const macroBackdrop = await macroContextIngestor.getMacroBackdrop();

      // 3. Process each equity with isolated failover boundaries
      for (let i = 0; i < targetMovers.length; i++) {
        const mover = targetMovers[i];
        console.log(`\n--- [Processing ${i + 1}/${targetMovers.length}: $${mover.ticker} (${mover.category.toUpperCase()})] ---`);

        try {
          // A. Ingest Fundamentals
          const fundamentals = await fundamentalDataIngestor.getFundamentals(mover.ticker, mover.name);

          // B. Ingest Social Sentiment & Web Intelligence
          const sentiment = await socialSentimentIngestor.getSentiment(mover.ticker, mover.category, mover.name);

          // C. LLM Multi-Agent Synthesis & Anti-Hallucination Fact-Checking
          const analysis = await synthesisAgent.generateReport(mover, fundamentals, macroBackdrop, sentiment);

          // D. Programmatic Affiliate & Ad Injection
          const { frontmatter, enrichedMarkdown } = adInjector.injectMonetization(mover, fundamentals, analysis);

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
// Run with "tsx pipeline/src/orchestrator.ts" to start the continuous cron daemon.
if (process.argv.includes('--run-now')) {
  console.log('[CLI] Detected --run-now argument. Executing immediate cycle...');
  orchestrator.runExecutionCycle('CLI_RUN_NOW').then(() => {
    console.log('[CLI] Execution cycle finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('[CLI] Unhandled error during CLI execution:', err);
    process.exit(1);
  });
} else if (process.argv[1]?.includes('orchestrator')) {
  orchestrator.startCron();
}
