import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://adschecks.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date('2026-04-02'),
      // Per-page overrides via sitemap filter if needed
      filter: (page) => !page.includes('/pricing-usage') && !page.includes('/refunds-disputes'),
    }),
  ],
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
