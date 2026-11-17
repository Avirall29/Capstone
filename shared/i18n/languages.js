// Language packs: one JSON file per language in ./locales, same keys as en.json.
// To add a language: copy en.json to <code>.json, translate the values, add one line below.
// `script` picks the font family (Anek per script; system font for scripts we don't bundle).
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', script: 'latin' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'devanagari' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'gurmukhi' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'bangla' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'devanagari' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'tamil' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'telugu' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'gujarati' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'kannada' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'malayalam' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'odia' }
];

export const DEFAULT_LANGUAGE = 'en';
export const languageInfo = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
