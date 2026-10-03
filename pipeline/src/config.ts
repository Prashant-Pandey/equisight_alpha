import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables from .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = fs.existsSync(path.resolve(process.cwd(), 'astro.config.mjs'))
  ? path.resolve(process.cwd())
  : path.resolve(__dirname, '../../..');

export const CONFIG = {
  // System environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  SITE_URL: process.env.SITE_URL || 'https://equisight-alpha.com',
  PLATFORM_NAME: process.env.PLATFORM_NAME || 'EquiSight Alpha',
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'compliance@equisight-alpha.com',

  // Coverage & Output Limits
  DAILY_REPORTS_TOTAL: 10,
  DAILY_GAINERS_COUNT: 5,
  DAILY_LOSERS_COUNT: 5,
  COVERAGE_LOCKOUT_DAYS: 365, // Trailing 12-month exclusion rule

  // LLM Providers (agy CLI default: 100% free with local Antigravity runtime)
  LLM_PROVIDER: (process.env.LLM_PROVIDER || 'agy').toLowerCase() as 'agy' | 'openai' | 'anthropic' | 'gemini' | 'mock',
  AGY_PATH: process.env.AGY_PATH || 'agy',
  AGY_MODEL: process.env.AGY_MODEL || 'gemini-3.8-flash-high',
  AGY_TIMEOUT_MS: parseInt(process.env.AGY_TIMEOUT_MS || '90000', 10),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  SEC_EDGAR_USER_AGENT: process.env.SEC_EDGAR_USER_AGENT || 'EquiSightResearch admin@equisight-alpha.com',

  // Financial APIs
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
  ALPHA_VANTAGE_KEY: process.env.ALPHA_VANTAGE_KEY || '',
  FMP_API_KEY: process.env.FMP_API_KEY || '',

  // Social Distribution
  TWITTER_ENABLED: process.env.TWITTER_ENABLED === 'true',
  TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
  TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || '',
  TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN || '',
  TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET || '',

  REDDIT_ENABLED: process.env.REDDIT_ENABLED === 'true',
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID || '',
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET || '',
  REDDIT_USERNAME: process.env.REDDIT_USERNAME || '',
  REDDIT_PASSWORD: process.env.REDDIT_PASSWORD || '',
  REDDIT_SUBREDDIT: process.env.REDDIT_SUBREDDIT || 'stocks',

  TELEGRAM_ENABLED: process.env.TELEGRAM_ENABLED === 'true',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',

  // Automated Deployment (Git)
  AUTO_TRIGGER_DEPLOY: process.env.AUTO_TRIGGER_DEPLOY === 'true',
  DEPLOY_COMMIT_MESSAGE: process.env.DEPLOY_COMMIT_MESSAGE || process.env.GIT_COMMIT_MESSAGE || '',
  DEPLOY_WEBHOOK_URL: process.env.DEPLOY_WEBHOOK_URL || '',

  // Paths
  PROJECT_ROOT: defaultProjectRoot,
  REPORTS_DIR: path.resolve(defaultProjectRoot, 'src/content/reports'),
  HISTORY_FILE: path.resolve(defaultProjectRoot, 'pipeline/data/coverage-history.json'),

  // Compliance
  PUBLISHER_EXEMPTION_LEGAL_ENTITY: 'EquiSight Analytics Media LLC',
  FINRA_RULE_NOTICE: 'Pursuant to Section 202(a)(11)(D) of the Investment Advisers Act of 1940 and FINRA Rule 2210.',
  
  // Rate limiting & retry backoff
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_BASE_DELAY_MS: 1500,
  API_TIMEOUT_MS: 12000,
  FACT_CHECK_TOLERANCE_PERCENT: 5.0, // Maximum allowed numeric deviation (5%)
};
