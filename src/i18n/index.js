import en from './locales/en.js';
import es from './locales/es.js';
import id from './locales/id.js';
import { chordSlugs as esChordSlugs, staticSlugs as esStaticSlugs, reverseChordSlugs as esReverseChordSlugs } from './slugs/es.js';
import { chordSlugs as idChordSlugs, staticSlugs as idStaticSlugs, reverseChordSlugs as idReverseChordSlugs } from './slugs/id.js';

const translations = { en, es, id };

const chordSlugMaps = { es: esChordSlugs, id: idChordSlugs };
const staticSlugMaps = { es: esStaticSlugs, id: idStaticSlugs };
const reverseChordSlugMaps = { es: esReverseChordSlugs, id: idReverseChordSlugs };

export const locales = ['en', 'es', 'id'];
export const defaultLocale = 'en';

/**
 * Get a translated UI string for a locale.
 * Supports simple {var} interpolation.
 */
export function t(locale, key, vars = {}) {
  const str = translations[locale]?.[key] || translations.en[key] || key;
  if (!Object.keys(vars).length) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/**
 * Determine locale from the current URL path.
 */
export function getLocaleFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'es') return 'es';
  if (segments[0] === 'id') return 'id';
  return 'en';
}

/**
 * Get the localized URL for a given English slug.
 * @param {string} locale - Target locale
 * @param {string} enSlug - English slug (e.g. 'c-major-chord-guitar' or 'contact')
 * @param {'chord'|'static'|'index'} type - Type of page
 */
export function getLocalizedUrl(locale, enSlug, type = 'chord') {
  if (type === 'index') {
    return locale === 'en' ? '/' : `/${locale}/`;
  }

  if (locale === 'en') {
    return `/${enSlug}/`;
  }

  const map = type === 'static' ? staticSlugMaps[locale] : chordSlugMaps[locale];
  const translatedSlug = map?.[enSlug] || enSlug;
  return `/${locale}/${translatedSlug}/`;
}

/**
 * Get the English slug from a translated slug (reverse lookup).
 */
export function getEnglishSlug(locale, translatedSlug, type = 'chord') {
  if (locale === 'en') return translatedSlug;
  if (type === 'chord') {
    return reverseChordSlugMaps[locale]?.[translatedSlug] || translatedSlug;
  }
  // For static pages, reverse lookup from the static map
  const map = staticSlugMaps[locale];
  const reversed = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
  return reversed[translatedSlug] || translatedSlug;
}

/**
 * Generate hreflang alternates for SEO.
 * @param {string} enSlug - The English slug for this page
 * @param {'chord'|'static'|'index'} type
 */
export function getHrefLangAlternates(enSlug, type = 'chord') {
  const site = 'https://www.chord-library.com';
  return locales.map(locale => ({
    locale,
    href: site + getLocalizedUrl(locale, enSlug, type),
  }));
}

/**
 * Get the difficulty label translated for a locale.
 */
export function getDifficultyLabel(locale, difficulty) {
  if (difficulty === 'Easy') return t(locale, 'difficultyEasy');
  if (difficulty === 'Medium') return t(locale, 'difficultyMedium');
  return t(locale, 'difficultyHard');
}

/**
 * Get the fret label translated for a locale.
 */
export function getFretLabel(locale, fretNum) {
  if (fretNum === -1) return '\u00D7';
  if (fretNum === 0) return t(locale, 'open');
  return `${t(locale, 'fret')} ${fretNum}`;
}
