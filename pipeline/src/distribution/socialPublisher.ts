import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../utils/httpClient.js';
import type { FinalReportFrontmatter } from '../types.js';

export interface SocialDistributionResult {
  ticker: string;
  twitterStatus: 'posted' | 'skipped' | 'mocked' | 'failed';
  redditStatus: 'posted' | 'skipped' | 'mocked' | 'failed';
  telegramStatus: 'posted' | 'skipped' | 'mocked' | 'failed';
  logMessages: string[];
}

export class SocialDistributionEngine {
  private logDir = path.resolve(CONFIG.PROJECT_ROOT, 'pipeline/logs');

  constructor() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Distributes social hooks to Twitter, Reddit, and Telegram upon report publication.
   */
  public async distributeReport(
    reportPath: string,
    frontmatter: FinalReportFrontmatter,
    reportSlug: string
  ): Promise<SocialDistributionResult> {
    const ticker = frontmatter.ticker;
    const reportUrl = `${CONFIG.SITE_URL}/reports/${reportSlug}`;
    const logs: string[] = [];

    logs.push(`[SocialDistribution] Starting broadcast for $${ticker} (${reportUrl})...`);

    // 1. Twitter / X Thread Distribution
    let twitterStatus: SocialDistributionResult['twitterStatus'] = 'skipped';
    try {
      if (CONFIG.TWITTER_ENABLED && CONFIG.TWITTER_API_KEY) {
        await this.postTwitterThread(frontmatter.socialHooks.twitter, reportUrl);
        twitterStatus = 'posted';
        logs.push(`[Twitter] Successfully posted 3-tweet thread for $${ticker}`);
      } else {
        twitterStatus = 'mocked';
        logs.push(`[Twitter] Mock mode active: Generated thread for $${ticker}:`);
        frontmatter.socialHooks.twitter.forEach((tweet, i) => logs.push(`   [Tweet ${i + 1}] ${tweet}`));
      }
    } catch (err: any) {
      twitterStatus = 'failed';
      logs.push(`[Twitter] Error broadcasting thread: ${err.message}`);
    }

    // 2. Reddit Deep-Dive Submission
    let redditStatus: SocialDistributionResult['redditStatus'] = 'skipped';
    try {
      if (CONFIG.REDDIT_ENABLED && CONFIG.REDDIT_CLIENT_ID && CONFIG.REDDIT_USERNAME) {
        await this.postRedditSubmission(
          frontmatter.socialHooks.redditTitle,
          frontmatter.description,
          reportUrl
        );
        redditStatus = 'posted';
        logs.push(`[Reddit] Successfully published DD post to r/${CONFIG.REDDIT_SUBREDDIT}`);
      } else {
        redditStatus = 'mocked';
        logs.push(`[Reddit] Mock mode active: Title: "${frontmatter.socialHooks.redditTitle}" to r/${CONFIG.REDDIT_SUBREDDIT}`);
      }
    } catch (err: any) {
      redditStatus = 'failed';
      logs.push(`[Reddit] Error publishing to r/${CONFIG.REDDIT_SUBREDDIT}: ${err.message}`);
    }

    // 3. Telegram Broadcast Alert
    let telegramStatus: SocialDistributionResult['telegramStatus'] = 'skipped';
    try {
      if (CONFIG.TELEGRAM_ENABLED && CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
        await this.sendTelegramAlert(frontmatter.socialHooks.telegram);
        telegramStatus = 'posted';
        logs.push(`[Telegram] Alert broadcasted to ${CONFIG.TELEGRAM_CHAT_ID}`);
      } else {
        telegramStatus = 'mocked';
        logs.push(`[Telegram] Mock mode: Broadcast payload: ${frontmatter.socialHooks.telegram}`);
      }
    } catch (err: any) {
      telegramStatus = 'failed';
      logs.push(`[Telegram] Error dispatching alert: ${err.message}`);
    }

    // Persist distribution log
    const logEntry = `\n[${new Date().toISOString()}] Broadcast for $${ticker}:\n` + logs.join('\n') + '\n';
    fs.appendFileSync(path.join(this.logDir, 'social-distribution.log'), logEntry, 'utf-8');

    return {
      ticker,
      twitterStatus,
      redditStatus,
      telegramStatus,
      logMessages: logs
    };
  }

  /**
   * Dispatches threaded tweets via Twitter API v2.
   */
  private async postTwitterThread(tweets: string[], reportUrl: string): Promise<void> {
    const url = 'https://api.twitter.com/2/tweets';
    let lastTweetId: string | null = null;

    for (let i = 0; i < tweets.length; i++) {
      let text = tweets[i];
      if (i === tweets.length - 1 && !text.includes('http')) {
        text += `\n\nFull analysis: ${reportUrl}`;
      }

      const bodyPayload: any = { text };
      if (lastTweetId) {
        bodyPayload.reply = { in_reply_to_tweet_id: lastTweetId };
      }

      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.TWITTER_ACCESS_TOKEN}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Twitter API rejected tweet ${i + 1}: ${errText}`);
      }

      const data = await res.json();
      lastTweetId = data?.data?.id || null;
    }
  }

  /**
   * Submits post to Reddit r/stocks via OAuth API.
   */
  private async postRedditSubmission(title: string, summary: string, reportUrl: string): Promise<void> {
    // 1. Get access token
    const authString = Buffer.from(`${CONFIG.REDDIT_CLIENT_ID}:${CONFIG.REDDIT_CLIENT_SECRET}`).toString('base64');
    const tokenUrl = 'https://www.reddit.com/api/v1/access_token';

    const tokenRes = await fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'EquiSightBot/1.0.0 by EquiSight Analytics'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: CONFIG.REDDIT_USERNAME,
        password: CONFIG.REDDIT_PASSWORD
      }).toString()
    });

    if (!tokenRes.ok) {
      throw new Error(`Reddit auth failed with status ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Submit post
    const submitUrl = 'https://oauth.reddit.com/api/submit';
    const postBody = `${summary}\n\nRead the complete quantitative breakdown, valuation ratios, and balance sheet stress test: ${reportUrl}\n\n*Strictly educational. Not financial advice.*`;

    const submitRes = await fetchWithRetry(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'EquiSightBot/1.0.0 by EquiSight Analytics'
      },
      body: new URLSearchParams({
        sr: CONFIG.REDDIT_SUBREDDIT,
        kind: 'self',
        title: title,
        text: postBody
      }).toString()
    });

    if (!submitRes.ok) {
      throw new Error(`Reddit submission failed: ${await submitRes.text()}`);
    }
  }

  /**
   * Telegram channel alert dispatcher.
   */
  private async sendTelegramAlert(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'Markdown'
      })
    });

    if (!res.ok) {
      throw new Error(`Telegram alert failed: ${await res.text()}`);
    }
  }
}

export const socialPublisher = new SocialDistributionEngine();
