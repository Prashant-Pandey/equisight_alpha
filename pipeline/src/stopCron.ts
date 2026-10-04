import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';

export interface StopCronResult {
  stoppedPids: number[];
  success: boolean;
  message: string;
}

/**
 * Checks whether a given PID is currently running.
 */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // EPERM means the process exists but belongs to another user / permission denied
    return err.code === 'EPERM';
  }
}

/**
 * Retrieves the command line / args for a running PID if accessible.
 */
function getCommandLineForPid(pid: number): string {
  try {
    if (process.platform === 'win32') {
      const output = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\").CommandLine"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return output.trim();
    } else {
      const output = execSync(`ps -p ${pid} -o args=`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return output.trim();
    }
  } catch {
    return '';
  }
}

/**
 * Discovers PIDs of running orchestrator cron daemon processes.
 */
export function findRunningOrchestratorCronPids(options: { includeRunNow?: boolean } = {}): number[] {
  const foundPids = new Set<number>();
  const currentPid = process.pid;

  // 1. Check PID file if present
  if (fs.existsSync(CONFIG.CRON_PID_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG.CRON_PID_FILE, 'utf-8').trim();
      const savedPid = parseInt(content, 10);
      if (!isNaN(savedPid) && savedPid !== currentPid && isPidAlive(savedPid)) {
        const cmd = getCommandLineForPid(savedPid);
        // Verify it is an orchestrator or node process before adding
        if (!cmd || cmd.includes('orchestrator') || cmd.includes('node') || cmd.includes('tsx')) {
          foundPids.add(savedPid);
        }
      } else if (!isNaN(savedPid) && !isPidAlive(savedPid)) {
        // Clean up stale PID file
        try {
          fs.unlinkSync(CONFIG.CRON_PID_FILE);
        } catch {}
      }
    } catch {}
  }

  // 2. Discover running processes from OS process table
  try {
    if (process.platform === 'win32') {
      const psCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like '*orchestrator.ts*' -or $_.CommandLine -like '*orchestrator.js*') } | Select-Object ProcessId, CommandLine | ConvertTo-Json"`;
      const stdout = execSync(psCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of list) {
            const pid = parseInt(item.ProcessId, 10);
            const cmd = (item.CommandLine || '').toLowerCase();
            if (
              !isNaN(pid) &&
              pid !== currentPid &&
              !cmd.includes('stopcron') &&
              !cmd.includes('stop_cron') &&
              !cmd.includes('--stop') &&
              (options.includeRunNow || !cmd.includes('--run-now'))
            ) {
              foundPids.add(pid);
            }
          }
        } catch {}
      }
    } else {
      // macOS / Linux / POSIX
      const stdout = execSync('ps -eo pid,ppid,args', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if command line contains orchestrator.ts
        if (trimmed.includes('orchestrator.ts') || trimmed.includes('pipeline/src/orchestrator')) {
          // Ignore grep/ps and current stopCron invocations
          if (
            trimmed.includes('stopCron') ||
            trimmed.includes('stop_cron') ||
            trimmed.includes('--stop') ||
            trimmed.includes('grep')
          ) {
            continue;
          }

          // Unless specified, ignore one-off --run-now execution cycles
          if (!options.includeRunNow && trimmed.includes('--run-now')) {
            continue;
          }

          const parts = trimmed.split(/\s+/);
          const pid = parseInt(parts[0], 10);
          if (!isNaN(pid) && pid !== currentPid && isPidAlive(pid)) {
            foundPids.add(pid);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[pipeline:stop_cron] Process scanning notice: ${err.message}`);
  }

  return Array.from(foundPids);
}

/**
 * Stops all running orchestrator cron daemon processes.
 */
export async function stopRunningCronJobs(options: {
  includeRunNow?: boolean;
  timeoutMs?: number;
} = {}): Promise<StopCronResult> {
  const timeoutMs = options.timeoutMs ?? 2500;
  const targetPids = findRunningOrchestratorCronPids(options);

  if (targetPids.length === 0) {
    // Clean up PID file if leftover
    if (fs.existsSync(CONFIG.CRON_PID_FILE)) {
      try {
        fs.unlinkSync(CONFIG.CRON_PID_FILE);
      } catch {}
    }
    const message = '[pipeline:stop_cron] No active cronjobs running orchestrator.ts found.';
    console.log(message);
    return { stoppedPids: [], success: true, message };
  }

  console.log(`[pipeline:stop_cron] Found ${targetPids.length} active cronjob process(es): PIDs [${targetPids.join(', ')}]. Stopping...`);

  // Send graceful SIGTERM first
  for (const pid of targetPids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }

  // Poll until processes terminate or timeout expires
  const startTime = Date.now();
  let lingeringPids = [...targetPids];
  while (lingeringPids.length > 0 && Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    lingeringPids = lingeringPids.filter((pid) => isPidAlive(pid));
  }

  // Send SIGKILL to any still-lingering processes
  if (lingeringPids.length > 0) {
    for (const pid of lingeringPids) {
      try {
        console.log(`[pipeline:stop_cron] Process ${pid} did not exit gracefully within ${timeoutMs}ms. Sending SIGKILL...`);
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Clean up PID file
  if (fs.existsSync(CONFIG.CRON_PID_FILE)) {
    try {
      fs.unlinkSync(CONFIG.CRON_PID_FILE);
    } catch {}
  }

  const stoppedPids: number[] = [];
  const failedPids: number[] = [];

  for (const pid of targetPids) {
    if (isPidAlive(pid)) {
      failedPids.push(pid);
    } else {
      stoppedPids.push(pid);
    }
  }

  if (failedPids.length === 0) {
    const message = `[pipeline:stop_cron] Successfully stopped ${stoppedPids.length} cronjob process(es): PIDs [${stoppedPids.join(', ')}].`;
    console.log(message);
    return { stoppedPids, success: true, message };
  } else {
    const message = `[pipeline:stop_cron] Partially stopped: Terminated PIDs [${stoppedPids.join(', ')}], failed PIDs [${failedPids.join(', ')}].`;
    console.error(message);
    return { stoppedPids, success: false, message };
  }
}

// CLI Execution Entry Point
const isDirectCli =
  process.argv[1]?.includes('stopCron') ||
  process.argv[1]?.includes('stop_cron') ||
  (import.meta.url && fileURLToPath(import.meta.url) === process.argv[1]);

if (isDirectCli) {
  const includeRunNow = process.argv.includes('--all') || process.argv.includes('--force');
  stopRunningCronJobs({ includeRunNow })
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[pipeline:stop_cron] Fatal error:', err);
      process.exit(1);
    });
}
