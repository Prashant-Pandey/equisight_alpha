import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { findRunningOrchestratorCronPids, isPidAlive } from './stopCron.js';

export interface StartCronResult {
  pid: number;
  isExisting: boolean;
  success: boolean;
  message: string;
}

/**
 * Starts the pipeline orchestrator cron scheduler in the background.
 */
export async function startCronDaemon(options: { foreground?: boolean } = {}): Promise<StartCronResult> {
  // 1. Check if a cron daemon is already actively running
  const runningPids = findRunningOrchestratorCronPids();
  if (runningPids.length > 0) {
    const existingPid = runningPids[0];
    const message = `[pipeline:cron] Cron daemon is already active in background (PID: ${existingPid}).`;
    console.log('================================================================');
    console.log(`[PipelineOrchestrator] Active Daemon Detected`);
    console.log('================================================================');
    console.log(`✓ Status: Running in background (PID: ${existingPid})`);
    console.log(`✓ Log File: ${CONFIG.CRON_LOG_FILE}`);
    console.log(`✓ Live Monitoring: tail -f ${CONFIG.CRON_LOG_FILE}`);
    console.log('✓ Stop Command: npm run pipeline:stop_cron');
    console.log('================================================================');
    return { pid: existingPid, isExisting: true, success: true, message };
  }

  // 2. Foreground execution mode (for direct debugging or container setups)
  if (options.foreground) {
    const { orchestrator } = await import('./orchestrator.js');
    orchestrator.startCron();
    return { pid: process.pid, isExisting: false, success: true, message: 'Running in foreground.' };
  }

  // 3. Ensure log directory and log file exist
  const logDir = path.dirname(CONFIG.CRON_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFd = fs.openSync(CONFIG.CRON_LOG_FILE, 'a');

  // Determine tsx launcher
  const tsxCli = path.resolve(CONFIG.PROJECT_ROOT, 'node_modules/tsx/dist/cli.mjs');
  const orchestratorPath = path.resolve(CONFIG.PROJECT_ROOT, 'pipeline/src/orchestrator.ts');

  let command: string;
  let args: string[];

  if (fs.existsSync(tsxCli)) {
    command = process.execPath;
    args = [tsxCli, orchestratorPath, '--foreground'];
  } else {
    command = 'npx';
    args = ['tsx', orchestratorPath, '--foreground'];
  }

  // 4. Spawn detached background process
  const child = spawn(command, args, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    cwd: CONFIG.PROJECT_ROOT,
    env: {
      ...process.env,
      CRON_DAEMON: 'true'
    }
  });

  child.unref();
  fs.closeSync(logFd);

  // 5. Await daemon initialization and verify PID lock
  let activePid: number | null = null;
  const startTime = Date.now();

  while (Date.now() - startTime < 3500) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (fs.existsSync(CONFIG.CRON_PID_FILE)) {
      try {
        const savedPid = parseInt(fs.readFileSync(CONFIG.CRON_PID_FILE, 'utf-8').trim(), 10);
        if (!isNaN(savedPid) && isPidAlive(savedPid)) {
          activePid = savedPid;
          break;
        }
      } catch {}
    }

    // Check if child exited prematurely
    if (child.pid && !isPidAlive(child.pid) && !fs.existsSync(CONFIG.CRON_PID_FILE)) {
      break;
    }
  }

  // Fallback to child PID if process is running
  if (!activePid && child.pid && isPidAlive(child.pid)) {
    activePid = child.pid;
  }

  if (!activePid || !isPidAlive(activePid)) {
    let recentLog = '';
    try {
      if (fs.existsSync(CONFIG.CRON_LOG_FILE)) {
        const fullLog = fs.readFileSync(CONFIG.CRON_LOG_FILE, 'utf-8');
        recentLog = fullLog.split('\n').slice(-10).join('\n');
      }
    } catch {}

    const errorMsg = `[pipeline:cron] Failed to start cron daemon in background.${recentLog ? `\nRecent logs:\n${recentLog}` : ''}`;
    console.error(errorMsg);
    return { pid: 0, isExisting: false, success: false, message: errorMsg };
  }

  console.log('================================================================');
  console.log(`[PipelineOrchestrator] Starting ${CONFIG.PLATFORM_NAME} Automation Engine`);
  console.log(`[Config] Lockout Window: ${CONFIG.COVERAGE_LOCKOUT_DAYS} days (Trailing 12-Month Rule)`);
  console.log(`[Config] Target Daily Output: ${CONFIG.DAILY_REPORTS_TOTAL} Reports (5 Gainers, 5 Losers)`);
  console.log(`[Scheduler] Pre-market Cron: ${CONFIG.CRON_SCHEDULE_PREMARKET || '0 7 * * 1-5'}`);
  console.log(`[Scheduler] Post-market Cron: ${CONFIG.CRON_SCHEDULE_POSTMARKET || '30 16 * * 1-5'}`);
  console.log('================================================================');
  console.log(`✓ Status: Cron daemon running in background (PID: ${activePid})`);
  console.log(`✓ Log File: ${CONFIG.CRON_LOG_FILE}`);
  console.log(`✓ Live Monitoring: tail -f ${CONFIG.CRON_LOG_FILE}`);
  console.log('✓ Stop Command: npm run pipeline:stop_cron');
  console.log('================================================================');

  return {
    pid: activePid,
    isExisting: false,
    success: true,
    message: `Cron daemon running in background with PID ${activePid}.`
  };
}

// CLI Execution Entry Point
const isDirectCli =
  process.argv[1]?.includes('startCron') ||
  process.argv[1]?.includes('start_cron') ||
  (import.meta.url && fileURLToPath(import.meta.url) === process.argv[1]);

if (isDirectCli) {
  const foreground = process.argv.includes('--foreground');
  startCronDaemon({ foreground })
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[pipeline:cron] Fatal startup error:', err);
      process.exit(1);
    });
}
