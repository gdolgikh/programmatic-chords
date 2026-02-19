import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.chord-library.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/auth/') &&
        !page.includes('/saved/') &&
        !/\/[a-g](-sharp)?-chord-guitar\/$/i.test(page),
    }),
  ],
  build: {
    inlineStylesheets: 'always',
  },
});
