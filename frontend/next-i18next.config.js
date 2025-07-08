module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    localePath: './public/locales',
    localeDetection: true,
  },
  fallbackLng: {
    'ar': ['ar', 'en'],
    'en': ['en'],
    default: ['en']
  },
  react: {
    useSuspense: false,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  serializeConfig: false,
  use: [
    require('i18next-browser-languagedetector'),
  ],
  detection: {
    order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
    caches: ['localStorage', 'cookie']
  },
  interpolation: {
    escapeValue: false,
  },
  saveMissing: true,
  updateMissing: true,
  debug: process.env.NODE_ENV === 'development',
};