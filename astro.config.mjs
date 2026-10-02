import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Auto-detect repository and owner in GitHub Actions if not explicitly provided
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repoOwner = process.env.GITHUB_REPOSITORY_OWNER;
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

const defaultSite = repoOwner ? `https://${repoOwner}.github.io` : 'https://equisight-alpha.com';
const defaultBase = isGitHubActions && repoName ? `/${repoName}` : '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || defaultSite,
  base: process.env.BASE_PATH || defaultBase,
  output: 'static',
  compressHTML: true,
  build: {
    // Configured for high page volumes (5,000+ reports)
    concurrency: 8,
    format: 'directory'
  },
  integrations: [
    tailwind({
      applyBaseStyles: true
    }),
    sitemap({
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date(),
      serialize(item) {
        if (item.url.includes('/reports/')) {
          item.priority = 0.9;
        }
        if (item.url.includes('/tickers/')) {
          item.priority = 0.7;
        }
        return item;
      }
    }),
    mdx()
  ]
});
