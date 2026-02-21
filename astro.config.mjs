import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.chord-library.com',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'id'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          es: 'es',
          id: 'id',
        },
      },
      filter: (page) =>
        !page.includes('/auth/') &&
        !page.includes('/saved/') &&
        !page.includes('/guardados/') &&
        !page.includes('/tersimpan/') &&
        !/\/[a-g](-sharp)?-chord-guitar\/$/i.test(page) &&
        !/\/acorde-[a-z]+-guitarra\/$/i.test(page) &&
        !/\/akor-[a-z]+-gitar\/$/i.test(page),
    }),
  ],
  build: {
    inlineStylesheets: 'always',
  },
});
