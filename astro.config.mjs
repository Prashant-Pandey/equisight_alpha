import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://equisight-alpha.com',
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
