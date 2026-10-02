import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';
import { historyTracker } from './historyTracker.js';
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
    content: string
  ): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const fileName = `${today}-${cleanSlug}.md`;
    const targetPath = path.join(this.outputDir, fileName);

    console.log(`[ReportFileGenerator] Writing Astro content file: ${fileName}...`);

    // Serialize frontmatter and body with gray-matter
    const fileContent = matter.stringify(content.trim() + '\n', frontmatter);

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
    return targetPath;
  }
}

export const reportGenerator = new ReportFileGenerator();
