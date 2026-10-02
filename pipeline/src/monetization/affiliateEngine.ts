import { CONFIG } from '../config.js';
import type { MarketMover, FundamentalMetrics, AffiliateLink } from '../types.js';

export class AffiliateEngine {
  /**
   * Evaluates ticker metadata, geography, volatility, and dividend profile
   * to select high-converting contextual affiliate offers.
   */
  public getContextualAffiliates(mover: MarketMover, fundamentals: FundamentalMetrics): AffiliateLink[] {
    const affiliates: AffiliateLink[] = [];
    const isEU = mover.region === 'EU' || mover.ticker.includes('.');
    const isHighDividend = fundamentals.dividendYield >= 2.5;
    const isHighVolatility = (fundamentals.beta ?? 1.0) > 1.4 || Math.abs(mover.changePercent) > 6.0;
    const isTechOrGrowth = fundamentals.sector.toLowerCase().includes('tech') || fundamentals.sector.toLowerCase().includes('communication');

    // 1. Primary Broker Selection based on Jurisdiction
    if (isEU) {
      affiliates.push({
        id: 'ibkr-eu',
        name: 'Interactive Brokers',
        category: 'broker',
        headline: 'Trade European & Global Equities with Lowest Margins',
        description: 'Direct market access across 150+ global exchanges with multi-currency accounts and institutional-grade order routing.',
        url: `https://www.interactivebrokers.com/mkt/?src=${CONFIG.AFFILIATE_IBKR_ID}&url=%2Fen%2Findex.php`,
        ctaText: 'Open Global Account',
        badge: 'Top Pick for EU Investors',
        disclosure: 'Capital at risk. Other fees apply.'
      });
    } else {
      affiliates.push({
        id: 'webull-us',
        name: 'Webull Financial',
        category: 'broker',
        headline: 'Commission-Free US Equities & Extended Hours',
        description: 'Full extended pre-market and after-hours trading session access with comprehensive Level 2 order book data.',
        url: `https://www.webull.com/activity?inviteCode=${CONFIG.AFFILIATE_WEBULL_ID}`,
        ctaText: 'Claim Free Stocks',
        badge: 'Best for Active Traders',
        disclosure: 'Securities offered through Webull Financial LLC, member FINRA/SIPC.'
      });
    }

    // 2. Specialized Charting / Screener Tool
    if (isTechOrGrowth || isHighVolatility) {
      affiliates.push({
        id: 'tradingview',
        name: 'TradingView Pro',
        category: 'screener',
        headline: `Advanced Interactive Technical Charts for $${mover.ticker}`,
        description: 'Multi-timeframe volume profile, Pine Script custom indicators, and institutional screener presets.',
        url: `https://www.tradingview.com/?aff_id=${CONFIG.AFFILIATE_TRADINGVIEW_ID}`,
        ctaText: 'Explore Pro Charting',
        badge: 'Standard for Equity Screeners',
        disclosure: 'Special promotional pricing applied via referral.'
      });
    }

    if (isHighVolatility) {
      affiliates.push({
        id: 'benzinga-pro',
        name: 'Benzinga Pro',
        category: 'data',
        headline: 'Track Unusual Options Flow & Institutional Block Trades',
        description: 'Instant audio squawk and real-time scanner alerting you when institutional money accumulates volatile equities.',
        url: `https://benzinga.grsm.io/${CONFIG.AFFILIATE_BENZINGA_ID}`,
        ctaText: 'Start 14-Day Free Trial',
        badge: 'Volatility Alert Engine',
        disclosure: 'Affiliate referral link.'
      });
    }

    // 3. Fundamental Research / Valuation Tool
    if (isHighDividend) {
      affiliates.push({
        id: 'seeking-alpha',
        name: 'Seeking Alpha Premium',
        category: 'research',
        headline: `Evaluate ${mover.ticker}'s Dividend Safety & Cash Flow`,
        description: 'Instant quant ratings, dividend cut probability scores, and 10+ years of normalized financial statement history.',
        url: `https://seekingalpha.com/affiliate_link?affid=${CONFIG.AFFILIATE_SEEKINGALPHA_ID}&ticker=${mover.ticker}`,
        ctaText: 'Get $50 Off Premium',
        badge: 'Dividend Research Standard',
        disclosure: 'Affiliate referral link. Terms apply.'
      });
    } else {
      affiliates.push({
        id: 'seeking-alpha',
        name: 'Seeking Alpha Premium',
        category: 'research',
        headline: `Full Wall Street Analyst Consensuses for $${mover.ticker}`,
        description: 'Review earnings revisions, institutional ownership trends, and proprietary Quant performance factor grades.',
        url: `https://seekingalpha.com/affiliate_link?affid=${CONFIG.AFFILIATE_SEEKINGALPHA_ID}&ticker=${mover.ticker}`,
        ctaText: 'Unlock Full Quant Analysis',
        badge: 'Wall St Consensus',
        disclosure: 'Affiliate referral link.'
      });
    }

    return affiliates;
  }
}

export const affiliateEngine = new AffiliateEngine();
