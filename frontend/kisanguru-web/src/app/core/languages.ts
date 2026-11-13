import { Script } from './transliterate';

export interface Language {
  code: string;
  /** Name written in the language itself, shown in the header selector. */
  label: string;
  /** English name, sent to the AI so it replies in this language. */
  english: string;
  /** BCP-47 tag for voice input, read-aloud and date formatting. */
  locale: string;
  /** Script used to show state names (transliterated from Hindi). */
  script: Script;
}

/** The 12 most widely spoken languages among Indian farmers. Add more by adding a file in core/i18n. */
export const LANGUAGES: Language[] = [
  { code: 'hi', label: 'हिन्दी', english: 'Hindi', locale: 'hi-IN', script: 'deva' },
  { code: 'en', label: 'English', english: 'English', locale: 'en-IN', script: 'latn' },
  { code: 'bn', label: 'বাংলা', english: 'Bengali', locale: 'bn-IN', script: 'beng' },
  { code: 'mr', label: 'मराठी', english: 'Marathi', locale: 'mr-IN', script: 'deva' },
  { code: 'te', label: 'తెలుగు', english: 'Telugu', locale: 'te-IN', script: 'telu' },
  { code: 'ta', label: 'தமிழ்', english: 'Tamil', locale: 'ta-IN', script: 'taml' },
  { code: 'gu', label: 'ગુજરાતી', english: 'Gujarati', locale: 'gu-IN', script: 'gujr' },
  { code: 'kn', label: 'ಕನ್ನಡ', english: 'Kannada', locale: 'kn-IN', script: 'knda' },
  { code: 'ml', label: 'മലയാളം', english: 'Malayalam', locale: 'ml-IN', script: 'mlym' },
  { code: 'or', label: 'ଓଡ଼ିଆ', english: 'Odia', locale: 'or-IN', script: 'orya' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', english: 'Punjabi', locale: 'pa-IN', script: 'guru' },
  { code: 'as', label: 'অসমীয়া', english: 'Assamese', locale: 'as-IN', script: 'asm' }
];

export const LANGUAGE_CODES = LANGUAGES.map(l => l.code);
