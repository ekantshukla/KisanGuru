// Devanagari → other Brahmic scripts (same approach as VaidikPandit's transliterate.ts).
// Brahmic Unicode blocks share the ISCII layout, so most letters convert by a fixed offset;
// letters missing in a target script fall back to the nearest letter.
// Used for state names, which the data file has in English and Hindi only.

export type Script = 'deva' | 'latn' | 'beng' | 'asm' | 'guru' | 'gujr' | 'orya' | 'taml' | 'telu' | 'knda' | 'mlym';

const BASE: Partial<Record<Script, number>> = {
  beng: 0x0980, asm: 0x0980, guru: 0x0a00, gujr: 0x0a80, orya: 0x0b00, taml: 0x0b80, telu: 0x0c00, knda: 0x0c80, mlym: 0x0d00
};
const ASSIGNED = /[\p{L}\p{M}\p{N}\p{P}\p{S}]/u;

const FALLBACK: Partial<Record<Script, Record<string, string>>> = {
  taml: { 'ख': 'क', 'ग': 'क', 'घ': 'क', 'छ': 'च', 'झ': 'ज', 'ठ': 'ट', 'ड': 'ट', 'ढ': 'ट', 'थ': 'त', 'द': 'त', 'ध': 'त', 'फ': 'प', 'ब': 'प', 'भ': 'प', 'श': 'ष' },
  beng: { 'व': 'ब' },
  guru: { 'ष': 'श', 'ृ': 'ि' }
};

const PRE: Partial<Record<Script, [RegExp, string][]>> = {
  taml: [[/ृ/g, '्रு'], [/ऋ/g, 'रு'], [/ं/g, 'म्']],
  guru: [[/ं/g, 'ੰ']]
};

const POST: Partial<Record<Script, [RegExp, string][]>> = {
  // Assamese uses the Bengali block but its own letter for ra
  asm: [[/র/g, 'ৰ']],
  // Gurmukhi: doubled consonant → addak (ੱ); other half-letters drop the virama except before r/v/h
  guru: [[/([ਕ-ਹ])੍\1/g, 'ੱ$1'], [/੍(?![ਰਵਹ])/g, '']]
};

export function toScript(devanagari: string, script: Script): string {
  if (script === 'deva' || script === 'latn') return devanagari;
  const base = BASE[script];
  if (base === undefined) return devanagari;

  let src = devanagari;
  for (const [re, rep] of PRE[script] ?? []) src = src.replace(re, rep);

  const fb = FALLBACK[script] ?? {};
  let out = '';
  for (const ch of src) {
    const code = ch.charCodeAt(0);
    if (ch === '।' || ch === '॥' || code < 0x0900 || code > 0x097f) { out += ch; continue; }
    const c = fb[ch] ?? ch;
    const target = String.fromCharCode(base + (c.charCodeAt(0) - 0x0900));
    out += ASSIGNED.test(target) ? target : c;
  }
  for (const [re, rep] of POST[script] ?? []) out = out.replace(re, rep);
  return out;
}
