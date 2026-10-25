import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';
import { historyTracker } from './historyTracker.js';
import { sitemapGenerator } from '../seo/sitemapGenerator.js';
import { stripRedundantDisclaimers } from '../llm/factChecker.js';
import type { MarketMover, FinalReportFrontmatter } from '../types.js';

export class ReportFileGenerator {
  private outputDir: string;

  constructor(outputDir = CONFIG.REPORTS_DIR) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Serializes report frontmatter and markdown body into an Astro Content Collection file.
   * Atomically saves the file and updates 12-month lock-out history.
   */
  public async saveReport(
    mover: MarketMover,
    slug: string,
    frontmatter: FinalReportFrontmatter,
    content: string,
    options?: { skipSitemap?: boolean }
  ): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const fileName = `${today}-${cleanSlug}.md`;
    const targetPath = path.join(this.outputDir, fileName);

    console.log(`[ReportFileGenerator] Writing Astro content file: ${fileName}...`);

    // Clean undefined fields to prevent YAML dump errors
    const sanitizedFrontmatter = JSON.parse(JSON.stringify(frontmatter));

    // Strip redundant LLM-generated legal disclaimers; presentation layer handles them deterministically
    const cleanedContent = stripRedundantDisclaimers(content);
    if (sanitizedFrontmatter.executiveSummaryData?.formattedMarkdown) {
      sanitizedFrontmatter.executiveSummaryData.formattedMarkdown = stripRedundantDisclaimers(
        sanitizedFrontmatter.executiveSummaryData.formattedMarkdown
      );
    }

    // Serialize frontmatter and body with gray-matter
    const fileContent = matter.stringify(cleanedContent.trim() + '\n', sanitizedFrontmatter);

    // Write file to disk
    await fs.promises.writeFile(targetPath, fileContent, 'utf-8');

    // Record ticker into trailing 12-month exclusion tracker
    await historyTracker.recordCoverage({
      ticker: mover.ticker.toUpperCase(),
      companyName: frontmatter.companyName,
      exchange: mover.exchange,
      coveredAt: new Date().toISOString(),
      category: mover.category,
      movePercent: mover.changePercent,
      slug: cleanSlug
    });

    console.log(`[ReportFileGenerator] Saved report to ${targetPath}. Coverage history updated.`);

    // Automatically regenerate sitemap whenever a report is generated
    if (!options?.skipSitemap) {
      try {
        await sitemapGenerator.generateSitemap({ reportsDir: this.outputDir });
      } catch (sitemapErr: any) {
        console.warn(`[ReportFileGenerator] Warning: Sitemap regeneration encountered an issue: ${sitemapErr.message}`);
      }
    }

    return targetPath;
  }
}

export const reportGenerator = new ReportFileGenerator();
