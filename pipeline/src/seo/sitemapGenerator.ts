import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../utils/httpClient.js';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapGenerationOptions {
  reportsDir?: string;
  outputDirs?: string[];
  siteUrl?: string;
  basePath?: string;
  notifySearchEngines?: boolean;
}

export interface SitemapGenerationResult {
  success: boolean;
  urlCount: number;
  filesWritten: string[];
  entries: SitemapEntry[];
  timestamp: string;
  error?: string;
}

export class SitemapGenerator {
  private siteUrl: string;
  private reportsDir: string;
  private publicDir: string;
  private distDir: string;

  constructor(
    siteUrl: string = CONFIG.SITE_URL || 'https://equisight-alpha.com',
    reportsDir: string = CONFIG.REPORTS_DIR,
    projectRoot: string = CONFIG.PROJECT_ROOT
  ) {
    this.siteUrl = siteUrl.replace(/\/+$/, '');
    this.reportsDir = reportsDir;
    this.publicDir = path.resolve(projectRoot, 'public');
    this.distDir = path.resolve(projectRoot, 'dist');
  }

  /**
   * Builds full absolute URL respecting optional base path and trailing slash.
   */
  public formatUrl(subpath: string, siteUrl: string = this.siteUrl, basePath: string = ''): string {
    const cleanSite = siteUrl.replace(/\/+$/, '');
    const cleanBase = basePath ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : '';
    const cleanSub = subpath.startsWith('/') ? subpath : `/${subpath}`;
    const withTrailing = cleanSub.endsWith('/') ? cleanSub : `${cleanSub}/`;
    return `${cleanSite}${cleanBase}${withTrailing}`;
  }

  /**
   * Collects core static platform routes.
   */
  public collectStaticEntries(siteUrl: string = this.siteUrl, basePath: string = ''): SitemapEntry[] {
    const now = new Date().toISOString();
    return [
      {
        loc: this.formatUrl('/', siteUrl, basePath),
        lastmod: now,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: this.formatUrl('/reports', siteUrl, basePath),
        lastmod: now,
        changefreq: 'daily',
        priority: 0.9
      },
      {
        loc: this.formatUrl('/definitions', siteUrl, basePath),
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.8
      },
      {
        loc: this.formatUrl('/disclaimer', siteUrl, basePath),
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.5
      }
    ];
  }

  /**
   * Scans markdown reports directory, extracting report routes and ticker hubs.
   */
  public collectReportAndTickerEntries(
    reportsDir: string = this.reportsDir,
    siteUrl: string = this.siteUrl,
    basePath: string = ''
  ): { reportEntries: SitemapEntry[]; tickerEntries: SitemapEntry[] } {
    const reportEntries: SitemapEntry[] = [];
    const tickerDateMap = new Map<string, string>();

    if (!fs.existsSync(reportsDir)) {
      return { reportEntries, tickerEntries: [] };
    }

    const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      try {
        const filePath = path.join(reportsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = matter(fileContent);
        const data = parsed.data || {};

        // In Astro Content Collections, entry.slug is the markdown filename without .md
        const rawSlug = file.replace(/\.md$/, '');
        const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        // Extract publish date or fallback to file stat
        let lastmod = new Date().toISOString();
        if (data.publishDate) {
          const parsedDate = new Date(data.publishDate);
          if (!isNaN(parsedDate.getTime())) {
            lastmod = parsedDate.toISOString();
          }
        } else {
          try {
            const stats = fs.statSync(filePath);
            lastmod = stats.mtime.toISOString();
          } catch {}
        }

        // Ticker tracking for ticker hub pages
        const ticker = (data.ticker || '').toString().trim().toUpperCase();
        if (ticker) {
          const existingDate = tickerDateMap.get(ticker);
          if (!existingDate || new Date(lastmod).getTime() > new Date(existingDate).getTime()) {
            tickerDateMap.set(ticker, lastmod);
          }
        }

        // 1. Primary Report Analysis Page (/reports/[slug]/)
        reportEntries.push({
          loc: this.formatUrl(`/reports/${cleanSlug}`, siteUrl, basePath),
          lastmod,
          changefreq: 'daily',
          priority: 0.9
        });

        // 2. Report Print / PDF Route (/reports/[slug]/print/)
        reportEntries.push({
          loc: this.formatUrl(`/reports/${cleanSlug}/print`, siteUrl, basePath),
          lastmod,
          changefreq: 'daily',
          priority: 0.8
        });

        // 3. Institutional Summary Route (/institutional-summary/[slug]/)
        reportEntries.push({
          loc: this.formatUrl(`/institutional-summary/${cleanSlug}`, siteUrl, basePath),
          lastmod,
          changefreq: 'daily',
          priority: 0.8
        });
      } catch (err: any) {
        console.warn(`[SitemapGenerator] Warning parsing report file ${file}: ${err.message}`);
      }
    }

    // Dynamic Ticker Hub Pages (/tickers/[ticker]/)
    const tickerEntries: SitemapEntry[] = Array.from(tickerDateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ticker, lastmod]) => ({
        loc: this.formatUrl(`/tickers/${ticker.toLowerCase()}`, siteUrl, basePath),
        lastmod,
        changefreq: 'daily',
        priority: 0.7
      }));

    return { reportEntries, tickerEntries };
  }

  /**
   * Escapes XML characters.
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generates standard XML sitemap urlset.
   */
  public buildUrlSetXml(entries: SitemapEntry[]): string {
    const urlsXml = entries
      .map((entry) => {
        let xml = `  <url>\n    <loc>${this.escapeXml(entry.loc)}</loc>`;
        if (entry.lastmod) {
          xml += `\n    <lastmod>${entry.lastmod}</lastmod>`;
        }
        if (entry.changefreq) {
          xml += `\n    <changefreq>${entry.changefreq}</changefreq>`;
        }
        if (typeof entry.priority === 'number') {
          xml += `\n    <priority>${entry.priority.toFixed(1)}</priority>`;
        }
        xml += '\n  </url>';
        return xml;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
      `xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ` +
      `xmlns:xhtml="http://www.w3.org/1999/xhtml" ` +
      `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ` +
      `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n` +
      `${urlsXml}\n` +
      `</urlset>\n`;
  }

  /**
   * Generates standard XML sitemap index.
   */
  public buildSitemapIndexXml(
    sitemapLocs: Array<{ loc: string; lastmod?: string }>
  ): string {
    const sitemapsXml = sitemapLocs
      .map((s) => {
        let xml = `  <sitemap>\n    <loc>${this.escapeXml(s.loc)}</loc>`;
        if (s.lastmod) {
          xml += `\n    <lastmod>${s.lastmod}</lastmod>`;
        }
        xml += '\n  </sitemap>';
        return xml;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${sitemapsXml}\n` +
      `</sitemapindex>\n`;
  }

  /**
   * Pings search engines (Google, Bing) with sitemap URL.
   */
  public async pingSearchEngines(
    sitemapUrl: string = `${this.siteUrl}/sitemap-index.xml`
  ): Promise<{ google: boolean; bing: boolean }> {
    const results = { google: false, bing: false };
    const encodedUrl = encodeURIComponent(sitemapUrl);

    try {
      await fetchWithRetry(`https://www.google.com/ping?sitemap=${encodedUrl}`, { timeoutMs: 5000, retries: 0 });
      results.google = true;
      console.log(`[SitemapGenerator] Google ping successful for: ${sitemapUrl}`);
    } catch {
      // Non-blocking ping failure
    }

    try {
      await fetchWithRetry(`https://www.bing.com/ping?sitemap=${encodedUrl}`, { timeoutMs: 5000, retries: 0 });
      results.bing = true;
      console.log(`[SitemapGenerator] Bing ping successful for: ${sitemapUrl}`);
    } catch {
      // Non-blocking ping failure
    }

    return results;
  }

  /**
   * Main execution: scans reports, builds sitemaps, and writes files to public/ and dist/ targets.
   */
  public async generateSitemap(
    options: SitemapGenerationOptions = {}
  ): Promise<SitemapGenerationResult> {
    try {
      const siteUrl = (options.siteUrl || this.siteUrl).replace(/\/+$/, '');
      const reportsDir = options.reportsDir || this.reportsDir;
      const basePath = options.basePath || process.env.BASE_PATH || '';

      // Determine output directories
      let outputDirs = options.outputDirs;
      if (!outputDirs || outputDirs.length === 0) {
        outputDirs = [this.publicDir];
        if (fs.existsSync(this.distDir)) {
          outputDirs.push(this.distDir);
        }
      }

      // Collect all URLs
      const staticEntries = this.collectStaticEntries(siteUrl, basePath);
      const { reportEntries, tickerEntries } = this.collectReportAndTickerEntries(reportsDir, siteUrl, basePath);

      const allEntries: SitemapEntry[] = [
        ...staticEntries,
        ...reportEntries,
        ...tickerEntries
      ];

      // Build XML payloads
      const urlsetXml = this.buildUrlSetXml(allEntries);
      const now = new Date().toISOString();
      const sitemapIndexXml = this.buildSitemapIndexXml([
        {
          loc: `${siteUrl}${basePath ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : ''}/sitemap-0.xml`,
          lastmod: now
        }
      ]);

      const filesWritten: string[] = [];

      for (const targetDir of outputDirs) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // 1. sitemap-0.xml (the direct URL set)
        const sitemap0Path = path.join(targetDir, 'sitemap-0.xml');
        fs.writeFileSync(sitemap0Path, urlsetXml, 'utf-8');
        filesWritten.push(sitemap0Path);

        // 2. sitemap.xml (root sitemap, providing direct URL set access for crawlers requesting /sitemap.xml)
        const sitemapXmlPath = path.join(targetDir, 'sitemap.xml');
        fs.writeFileSync(sitemapXmlPath, urlsetXml, 'utf-8');
        filesWritten.push(sitemapXmlPath);

        // 3. sitemap-index.xml (index pointing to sitemap-0.xml, matching robots.txt & SEOHead)
        const sitemapIndexPath = path.join(targetDir, 'sitemap-index.xml');
        fs.writeFileSync(sitemapIndexPath, sitemapIndexXml, 'utf-8');
        filesWritten.push(sitemapIndexPath);
      }

      console.log(
        `[SitemapGenerator] Generated sitemaps with ${allEntries.length} URLs ` +
        `(${staticEntries.length} static, ${reportEntries.length} reports, ${tickerEntries.length} tickers) ` +
        `across ${outputDirs.length} directory targets.`
      );

      if (options.notifySearchEngines) {
        await this.pingSearchEngines(`${siteUrl}/sitemap-index.xml`);
      }

      return {
        success: true,
        urlCount: allEntries.length,
        filesWritten,
        entries: allEntries,
        timestamp: now
      };
    } catch (err: any) {
      console.error(`[SitemapGenerator] Error generating sitemap: ${err.message}`, err);
      return {
        success: false,
        urlCount: 0,
        filesWritten: [],
        entries: [],
        timestamp: new Date().toISOString(),
        error: err.message
      };
    }
  }
}

export const sitemapGenerator = new SitemapGenerator();

// CLI Execution support
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('sitemapGenerator')) {
  sitemapGenerator.generateSitemap().then((res) => {
    console.log(`[SitemapCLI] Successfully indexed ${res.urlCount} URLs. Written files:`);
    for (const f of res.filesWritten) {
      console.log(`  - ${f}`);
    }
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error('[SitemapCLI] Failed:', err);
    process.exit(1);
  });
}
