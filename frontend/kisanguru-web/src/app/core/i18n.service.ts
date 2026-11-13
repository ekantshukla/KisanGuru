import { Injectable, computed, effect, signal } from '@angular/core';
import { LANGUAGES, Language } from './languages';
import { LocalizedText } from './models';
import { toScript } from './transliterate';
import en from './i18n/en';
import hi from './i18n/hi';

type Dict = Record<string, string>;

/** Hindi and English ship in the main bundle; every other language is a small lazy-loaded chunk. */
const LOADERS: Record<string, () => Promise<{ default: Dict }>> = {
  bn: () => import('./i18n/bn'),
  mr: () => import('./i18n/mr'),
  te: () => import('./i18n/te'),
  ta: () => import('./i18n/ta'),
  gu: () => import('./i18n/gu'),
  kn: () => import('./i18n/kn'),
  ml: () => import('./i18n/ml'),
  or: () => import('./i18n/or'),
  pa: () => import('./i18n/pa'),
  as: () => import('./i18n/as')
};

const STORAGE_KEY = 'km.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages = LANGUAGES;
  readonly lang = signal<string>(this.initial());
  readonly current = computed<Language>(() => LANGUAGES.find(l => l.code === this.lang()) ?? LANGUAGES[0]);
  private readonly dicts = signal<Record<string, Dict>>({ en, hi });

  constructor() {
    effect(() => {
      const code = this.lang();
      document.documentElement.lang = code;
      try { localStorage.setItem(STORAGE_KEY, code); } catch { /* storage unavailable */ }
      this.ensureLoaded(code);
    });
  }

  set(code: string): void {
    if (LANGUAGES.some(l => l.code === code)) this.lang.set(code);
  }

  /** UI text. Marathi falls back to Hindi (same script, shared words), everything else to English. */
  t(key: string): string {
    const d = this.dicts();
    const code = this.lang();
    const chain = code === 'mr' ? [d['mr'], hi, en] : [d[code], en];
    for (const dict of chain) {
      const v = dict?.[key];
      if (v) return v;
    }
    return key;
  }

  /** Text from the API: Hindi, English, or the server's translation into the chosen language. */
  loc(text: LocalizedText | null | undefined): string {
    if (!text) return '';
    const code = this.lang();
    if (code === 'hi') return text.hi;
    if (code === 'en') return text.en;
    return text.local || (code === 'mr' ? text.hi : text.en);
  }

  /** True when API content on screen is a machine translation (shown with a small note). */
  isAutoTranslated(text: LocalizedText | null | undefined): boolean {
    return !!text?.local && !['hi', 'en'].includes(this.lang());
  }

  /** State name in the reader's script, e.g. "ಕರ್ನಾಟಕ (Karnataka)". */
  stateName(english: string, hindi: string): string {
    const code = this.lang();
    if (code === 'en') return english;
    if (code === 'hi' || code === 'mr') return hindi;
    return `${toScript(hindi, this.current().script)} (${english})`;
  }

  locale(): string {
    return this.current().locale;
  }

  private ensureLoaded(code: string): void {
    if (this.dicts()[code] || !LOADERS[code]) return;
    LOADERS[code]().then(m => this.dicts.update(d => ({ ...d, [code]: m.default })));
  }

  private initial(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES.some(l => l.code === saved)) return saved;
    } catch { /* storage unavailable */ }
    const browser = (typeof navigator !== 'undefined' ? navigator.language : 'hi').slice(0, 2);
    return LANGUAGES.some(l => l.code === browser) ? browser : 'hi';
  }
}
