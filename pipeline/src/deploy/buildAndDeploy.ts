import { exec, execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

export interface BuildAndDeployResult {
  success: boolean;
  pagesBuilt?: number;
  deployTriggered: boolean;
  gitPushed: boolean;
  webhookTriggered: boolean;
  error?: string;
}

export class BuildAndDeployManager {
  private projectRoot: string;

  constructor(projectRoot: string = CONFIG.PROJECT_ROOT) {
    this.projectRoot = projectRoot;
  }

  /**
   * Compiles the static Astro build and triggers automated git deployment (git add, git commit, git push).
   */
  public async executeBuildAndDeploy(customCommitMessage?: string): Promise<BuildAndDeployResult> {
    console.log('[BuildAndDeploy] Initiating automated static compilation (Astro build)...');

    let buildSuccess = false;
    let pagesCount = 0;

    try {
      // 1. Run local static build
      const { stdout, stderr } = await execAsync('npx astro build', {
        cwd: this.projectRoot,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      console.log('[BuildAndDeploy] Astro build completed successfully.');

      // Count generated html pages in dist/
      const distDir = path.resolve(this.projectRoot, 'dist');
      if (fs.existsSync(distDir)) {
        pagesCount = this.countHtmlFiles(distDir);
        console.log(`[BuildAndDeploy] Generated ${pagesCount} static HTML pages ready for edge serving.`);
      }

      buildSuccess = true;
    } catch (err: any) {
      console.error('[BuildAndDeploy] Astro build failed:', err.message);
      return {
        success: false,
        deployTriggered: false,
        gitPushed: false,
        webhookTriggered: false,
        error: err.message
      };
    }

    // 2. Trigger Automated Git Deployment if configured (git add ., git commit -m '<message>', git push)
    let deployTriggered = false;
    let gitPushed = false;
    let deployError: string | undefined;

    if (CONFIG.AUTO_TRIGGER_DEPLOY) {
      try {
        console.log('[BuildAndDeploy] AUTO_TRIGGER_DEPLOY is enabled: Executing automated git deployment...');
        const message =
          CONFIG.DEPLOY_COMMIT_MESSAGE ||
          customCommitMessage ||
          `chore(deploy): automated equity research update [${new Date().toISOString()}]`;

        const gitResult = await this.triggerGitDeploy(message);
        deployTriggered = gitResult.pushed;
        gitPushed = gitResult.pushed;
      } catch (gitErr: any) {
        deployError = gitErr.message;
        console.error('[BuildAndDeploy] Git deployment failed:', gitErr.message);
      }
    } else {
      console.log('[BuildAndDeploy] AUTO_TRIGGER_DEPLOY is disabled. Skipping git deployment.');
    }

    return {
      success: buildSuccess,
      pagesBuilt: pagesCount,
      deployTriggered,
      gitPushed,
      webhookTriggered: false,
      error: deployError
    };
  }

  /**
   * Executes git add ., git commit -m '<message>', and git push.
   */
  public async triggerGitDeploy(
    commitMessage: string,
    options?: { cwd?: string; skipPush?: boolean }
  ): Promise<{ committed: boolean; pushed: boolean }> {
    const cwd = options?.cwd || this.projectRoot;

    // Provide fallback git author environment if none configured in the current environment
    const gitEnv = { ...process.env };
    try {
      await execFileAsync('git', ['var', 'GIT_AUTHOR_IDENT'], { cwd });
    } catch {
      gitEnv.GIT_AUTHOR_NAME = gitEnv.GIT_AUTHOR_NAME || 'EquiSight Bot';
      gitEnv.GIT_AUTHOR_EMAIL = gitEnv.GIT_AUTHOR_EMAIL || 'bot@equisight-alpha.com';
      gitEnv.GIT_COMMITTER_NAME = gitEnv.GIT_COMMITTER_NAME || 'EquiSight Bot';
      gitEnv.GIT_COMMITTER_EMAIL = gitEnv.GIT_COMMITTER_EMAIL || 'bot@equisight-alpha.com';
    }

    // 1. git add .
    console.log('[BuildAndDeploy] Executing: git add .');
    await execFileAsync('git', ['add', '.'], { cwd, env: gitEnv });

    // 2. git commit -m '<message>'
    const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd, env: gitEnv });
    let committed = false;

    if (status.trim().length > 0) {
      console.log(`[BuildAndDeploy] Executing: git commit -m "${commitMessage}"`);
      await execFileAsync('git', ['commit', '-m', commitMessage], { cwd, env: gitEnv });
      console.log('[BuildAndDeploy] Git commit completed successfully.');
      committed = true;
    } else {
      console.log('[BuildAndDeploy] No staged changes detected to commit.');
    }

    // 3. git push
    let pushed = false;
    if (options?.skipPush) {
      console.log('[BuildAndDeploy] Skip push flag enabled. Bypassing git push.');
      pushed = true;
    } else {
      console.log('[BuildAndDeploy] Executing: git push');
      try {
        const { stdout: pushStdout, stderr: pushStderr } = await execFileAsync('git', ['push'], { cwd, env: gitEnv });
        if (pushStdout?.trim()) console.log(`[BuildAndDeploy] ${pushStdout.trim()}`);
        if (pushStderr?.trim()) console.log(`[BuildAndDeploy] ${pushStderr.trim()}`);
      } catch (pushErr: any) {
        if (pushErr.message?.includes('no upstream branch') || pushErr.message?.includes('set-upstream')) {
          const { stdout: branch } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, env: gitEnv });
          const branchName = branch.trim();
          console.log(`[BuildAndDeploy] Setting upstream branch and pushing: git push -u origin ${branchName}`);
          await execFileAsync('git', ['push', '-u', 'origin', branchName], { cwd, env: gitEnv });
        } else {
          throw pushErr;
        }
      }
      console.log('[BuildAndDeploy] Git push completed successfully.');
      pushed = true;
    }

    return { committed, pushed };
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
