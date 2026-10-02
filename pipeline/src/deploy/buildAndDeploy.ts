import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../utils/httpClient.js';

const execAsync = util.promisify(exec);

export class BuildAndDeployManager {
  /**
   * Compiles the static Astro build and triggers external deployment webhooks.
   */
  public async executeBuildAndDeploy(): Promise<{ success: boolean; pagesBuilt?: number; webhookTriggered: boolean; error?: string }> {
    console.log('[BuildAndDeploy] Initiating automated static compilation (Astro build)...');

    let buildSuccess = false;
    let pagesCount = 0;

    try {
      // 1. Run local static build
      const { stdout, stderr } = await execAsync('npx astro build', {
        cwd: CONFIG.PROJECT_ROOT,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      console.log('[BuildAndDeploy] Astro build completed successfully.');

      // Count generated html pages in dist/
      const distDir = path.resolve(CONFIG.PROJECT_ROOT, 'dist');
      if (fs.existsSync(distDir)) {
        pagesCount = this.countHtmlFiles(distDir);
        console.log(`[BuildAndDeploy] Generated ${pagesCount} static HTML pages ready for edge serving.`);
      }

      buildSuccess = true;
    } catch (err: any) {
      console.error('[BuildAndDeploy] Astro build failed:', err.message);
      return { success: false, webhookTriggered: false, error: err.message };
    }

    // 2. Trigger External Deployment Webhook if configured
    let webhookTriggered = false;
    if (CONFIG.AUTO_TRIGGER_DEPLOY && CONFIG.DEPLOY_WEBHOOK_URL) {
      try {
        console.log(`[BuildAndDeploy] Triggering deploy webhook: ${CONFIG.DEPLOY_WEBHOOK_URL}...`);
        const res = await fetchWithRetry(CONFIG.DEPLOY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'NEW_STOCK_REPORTS_PUBLISHED',
            timestamp: new Date().toISOString(),
            pagesCount
          })
        });

        if (res.ok) {
          webhookTriggered = true;
          console.log('[BuildAndDeploy] Deploy webhook triggered successfully.');
        } else {
          console.warn(`[BuildAndDeploy] Deploy webhook returned status ${res.status}`);
        }
      } catch (webhookErr: any) {
        console.error('[BuildAndDeploy] Failed to call deploy webhook:', webhookErr.message);
      }
    }

    return {
      success: buildSuccess,
      pagesBuilt: pagesCount,
      webhookTriggered
    };
  }

  private countHtmlFiles(dir: string): number {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += this.countHtmlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        count++;
      }
    }

    return count;
  }
}

export const buildAndDeployManager = new BuildAndDeployManager();
