/**
 * Pure teaching models for the lyriic post demos.
 * Numbers and pack formats mirror lyriic's dict packs (illustrative mini-dicts).
 */

export type StressCode = 0 | 1 | 2;

export const STRESS_LABEL: Record<StressCode, string> = {
  0: "unstressed",
  1: "primary",
  2: "secondary",
};

/** Pack 2-bit stress codes into a u32 (low syllable → low bits). */
export function packStressPattern(pattern: readonly StressCode[]): number {
  if (pattern.length > 16) {
    throw new Error(`stress pattern too long: ${pattern.length}`);
  }
  let packed = 0;
  for (let i = 0; i < pattern.length; i++) {
    const code = pattern[i]! & 3;
    packed |= (code === 3 ? 0 : code) << (i * 2);
  }
  return packed >>> 0;
}

export function unpackStressPattern(
  packed: number,
  syllableCount: number,
): StressCode[] {
  const n = Math.min(Math.max(0, syllableCount | 0), 16);
  const out: StressCode[] = [];
  for (let i = 0; i < n; i++) {
    const code = (packed >>> (i * 2)) & 3;
    out.push((code === 3 ? 0 : code) as StressCode);
  }
  return out;
}

export function stressToBinaryString(
  packed: number,
  syllableCount: number,
): string {
  const bits = syllableCount * 2;
  return packed.toString(2).padStart(Math.max(bits, 1), "0");
}

export type FrontCodedEntry = {
  word: string;
  shared: number;
  rest: string;
  /** Bytes for shared(u8) + restLen(u16) + UTF-8 rest. */
  storedBytes: number;
  rawBytes: number;
};

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Front-code a sorted word list the same way lyriic packs lemmas. */
export function frontCodeWords(words: readonly string[]): {
  entries: FrontCodedEntry[];
  rawTotal: number;
  storedTotal: number;
} {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  const entries: FrontCodedEntry[] = [];
  let prev = "";
  let rawTotal = 0;
  let storedTotal = 0;

  for (const word of sorted) {
    let shared = 0;
    const max = Math.min(prev.length, word.length, 255);
    while (shared < max && prev[shared] === word[shared]) shared += 1;
    const rest = word.slice(shared);
    const rawBytes = utf8ByteLength(word);
    const storedBytes = 1 + 2 + utf8ByteLength(rest);
    entries.push({ word, shared, rest, storedBytes, rawBytes });
    rawTotal += rawBytes;
    storedTotal += storedBytes;
    prev = word;
  }

  return { entries, rawTotal, storedTotal };
}

export type Phone = {
  phone: string;
  /** Stress on vowels only; consonants omit. */
  stress?: StressCode;
  isVowel: boolean;
};

export type RhymeWord = {
  word: string;
  phones: Phone[];
  perfectKey: string;
  endKey: string;
  syllables: number;
  stress: StressCode[];
};

/**
 * Tiny hand-built dictionary for demos. Keys match lyriic's IPA rhyme rules
 * (perfect from last primary; end from last nucleus, stress ignored).
 */
export const RHYME_LEXICON: RhymeWord[] = [
  {
    word: "fire",
    phones: [
      { phone: "f", isVowel: false },
      { phone: "aɪ", isVowel: true, stress: 1 },
      { phone: "ɚ", isVowel: true, stress: 0 },
    ],
    perfectKey: "aɪɚ",
    endKey: "aɪɚ",
    syllables: 2,
    stress: [1, 0],
  },
  {
    word: "hire",
    phones: [
      { phone: "h", isVowel: false },
      { phone: "aɪ", isVowel: true, stress: 1 },
      { phone: "ɚ", isVowel: true, stress: 0 },
    ],
    perfectKey: "aɪɚ",
    endKey: "aɪɚ",
    syllables: 2,
    stress: [1, 0],
  },
  {
    word: "desire",
    phones: [
      { phone: "d", isVowel: false },
      { phone: "ɪ", isVowel: true, stress: 0 },
      { phone: "z", isVowel: false },
      { phone: "aɪ", isVowel: true, stress: 1 },
      { phone: "ɚ", isVowel: true, stress: 0 },
    ],
    perfectKey: "aɪɚ",
    endKey: "aɪɚ",
    syllables: 3,
    stress: [0, 1, 0],
  },
  {
    word: "fun",
    phones: [
      { phone: "f", isVowel: false },
      { phone: "ʌ", isVowel: true, stress: 1 },
      { phone: "n", isVowel: false },
    ],
    perfectKey: "ʌn",
    endKey: "ʌn",
    syllables: 1,
    stress: [1],
  },
  {
    word: "anyone",
    phones: [
      { phone: "ɛ", isVowel: true, stress: 1 },
      { phone: "n", isVowel: false },
      { phone: "i", isVowel: true, stress: 0 },
      { phone: "w", isVowel: false },
      { phone: "ʌ", isVowel: true, stress: 2 },
      { phone: "n", isVowel: false },
    ],
    perfectKey: "ɛniwʌn",
    endKey: "ʌn",
    syllables: 3,
    stress: [1, 0, 2],
  },
  {
    word: "someone",
    phones: [
      { phone: "s", isVowel: false },
      { phone: "ʌ", isVowel: true, stress: 1 },
      { phone: "m", isVowel: false },
      { phone: "w", isVowel: false },
      { phone: "ʌ", isVowel: true, stress: 2 },
      { phone: "n", isVowel: false },
    ],
    perfectKey: "ʌmwʌn",
    endKey: "ʌn",
    syllables: 2,
    stress: [1, 2],
  },
  {
    word: "butter",
    phones: [
      { phone: "b", isVowel: false },
      { phone: "ʌ", isVowel: true, stress: 1 },
      { phone: "t", isVowel: false },
      { phone: "ɚ", isVowel: true, stress: 0 },
    ],
    perfectKey: "ʌtɚ",
    endKey: "ɚ",
    syllables: 2,
    stress: [1, 0],
  },
  {
    word: "meter",
    phones: [
      { phone: "m", isVowel: false },
      { phone: "i", isVowel: true, stress: 1 },
      { phone: "t", isVowel: false },
      { phone: "ɚ", isVowel: true, stress: 0 },
    ],
    perfectKey: "itɚ",
    endKey: "ɚ",
    syllables: 2,
    stress: [1, 0],
  },
  {
    word: "banana",
    phones: [
      { phone: "b", isVowel: false },
      { phone: "ə", isVowel: true, stress: 0 },
      { phone: "n", isVowel: false },
      { phone: "æ", isVowel: true, stress: 1 },
      { phone: "n", isVowel: false },
      { phone: "ə", isVowel: true, stress: 0 },
    ],
    perfectKey: "ænə",
    endKey: "ə",
    syllables: 3,
    stress: [0, 1, 0],
  },
  {
    word: "poetry",
    phones: [
      { phone: "p", isVowel: false },
      { phone: "oʊ", isVowel: true, stress: 1 },
      { phone: "ə", isVowel: true, stress: 0 },
      { phone: "t", isVowel: false },
      { phone: "ɹ", isVowel: false },
      { phone: "i", isVowel: true, stress: 0 },
    ],
    perfectKey: "oʊətɹi",
    endKey: "i",
    syllables: 3,
    stress: [1, 0, 0],
  },
];

export function findRhymeWord(word: string): RhymeWord | undefined {
  const needle = word.trim().toLowerCase();
  return RHYME_LEXICON.find((w) => w.word === needle);
}

export type RhymeMode = "perfect" | "end";

export function rhymeKeyFor(word: RhymeWord, mode: RhymeMode): string {
  return mode === "perfect" ? word.perfectKey : word.endKey;
}

/** Index of the phone where the perfect rhyme key starts (last primary vowel). */
export function perfectKeyStartIndex(phones: readonly Phone[]): number {
  for (let i = phones.length - 1; i >= 0; i--) {
    if (phones[i]!.isVowel && phones[i]!.stress === 1) return i;
  }
  for (let i = phones.length - 1; i >= 0; i--) {
    if (phones[i]!.isVowel && phones[i]!.stress === 2) return i;
  }
  for (let i = phones.length - 1; i >= 0; i--) {
    if (phones[i]!.isVowel) return i;
  }
  return 0;
}

/** Index of the phone where the end rhyme key starts (last vowel nucleus). */
export function endKeyStartIndex(phones: readonly Phone[]): number {
  for (let i = phones.length - 1; i >= 0; i--) {
    if (phones[i]!.isVowel) return i;
  }
  return 0;
}

export function keyStartIndex(word: RhymeWord, mode: RhymeMode): number {
  return mode === "perfect"
    ? perfectKeyStartIndex(word.phones)
    : endKeyStartIndex(word.phones);
}

export function bucketFor(
  word: RhymeWord,
  mode: RhymeMode,
): RhymeWord[] {
  const key = rhymeKeyFor(word, mode);
  return RHYME_LEXICON.filter(
    (w) => w.word !== word.word && rhymeKeyFor(w, mode) === key,
  );
}

/** Tiny Zipf-ish order for the demo lexicon (hand-ranked popularity). */
const DEMO_ZIPF_ORDER = [
  "fun",
  "fire",
  "someone",
  "anyone",
  "butter",
  "meter",
  "hire",
  "desire",
  "banana",
  "poetry",
] as const;

export function zipfRank(word: string): number {
  const i = DEMO_ZIPF_ORDER.indexOf(word as (typeof DEMO_ZIPF_ORDER)[number]);
  return i === -1 ? 999 : i;
}

export function sortedBucket(
  word: RhymeWord,
  mode: RhymeMode,
): RhymeWord[] {
  return [...bucketFor(word, mode)].sort(
    (a, b) => zipfRank(a.word) - zipfRank(b.word),
  );
}

/** Demo syllable counts for the "zen vs counting" opener. */
const DEMO_SYLLABLES: Record<string, number> = {
  the: 1,
  a: 1,
  an: 1,
  i: 1,
  you: 1,
  we: 1,
  to: 1,
  of: 1,
  in: 1,
  on: 1,
  my: 1,
  and: 1,
  but: 1,
  for: 1,
  with: 1,
  that: 1,
  this: 1,
  when: 1,
  night: 1,
  light: 1,
  heart: 1,
  love: 1,
  song: 1,
  line: 1,
  word: 1,
  words: 1,
  write: 1,
  wrote: 1,
  rhyme: 1,
  rhymes: 1,
  verse: 1,
  moon: 1,
  rain: 1,
  fire: 2,
  desire: 3,
  banana: 3,
  poetry: 3,
  anyone: 3,
  someone: 2,
  butter: 2,
  meter: 2,
  syllable: 4,
  syllables: 4,
  counting: 2,
  forever: 3,
  together: 3,
  beautiful: 4,
  memory: 3,
  memories: 3,
  tomorrow: 3,
  yesterday: 4,
  evening: 2,
  morning: 2,
  quietly: 3,
  lonely: 2,
  alone: 2,
  again: 2,
  never: 2,
  always: 2,
  nothing: 2,
  everything: 4,
  somewhere: 2,
  nowhere: 2,
  melody: 3,
  harmony: 3,
  chorus: 2,
  couplet: 2,
  sonnet: 2,
  haiku: 2,
  iambic: 3,
  pentameter: 4,
};

/** MorphAdorner-ish fallback for the demo only (not lyriic's full heuristic). */
export function demoSyllableCount(raw: string): number {
  const word = raw.toLowerCase().replace(/[^a-z']/g, "");
  if (!word) return 0;
  if (DEMO_SYLLABLES[word] != null) return DEMO_SYLLABLES[word]!;

  const cleaned = word.replace(/'/g, "");
  if (cleaned.length <= 3) return 1;

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;
  for (const ch of cleaned) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevVowel) count += 1;
    prevVowel = isVowel;
  }
  if (cleaned.endsWith("e") && count > 1) count -= 1;
  if (cleaned.endsWith("le") && cleaned.length > 2 && !vowels.includes(cleaned[cleaned.length - 3]!)) {
    count += 1;
  }
  return Math.max(1, count);
}

export function tokenizeLine(line: string): string[] {
  return line.match(/[A-Za-z']+/g) ?? [];
}

export function lineSyllableTotal(line: string): number {
  return tokenizeLine(line).reduce((sum, w) => sum + demoSyllableCount(w), 0);
}

/** Production pack sizes from lyriic (MiB), for the wire-budget demo. */
export const PACK_SIZES_MIB = {
  lexiconRaw: 1.74,
  lexiconBrotli: 0.56,
  stressRaw: 1.05,
  stressBrotli: 0.09,
  variantsRaw: 0.09,
  variantsBrotli: 0.02,
  rhymePerfectRaw: 2.67,
  rhymePerfectBrotli: 1.4,
  rhymeEndRaw: 1.41,
  rhymeEndBrotli: 0.84,
  thesaurusRaw: 1.6,
  thesaurusBrotli: 0.77,
  totalRaw: 8.57,
  totalBrotli: 3.68,
  /** Naive JSON comparisons measured against the same lexicon. */
  jsonWordsOnly: 3.0,
  jsonSyllableMap: 3.53,
  jsonPerfectRhyme: 9.46,
} as const;

export const CORPUS_STATS = {
  lemmas: 276_493,
  perfectKeys: 95_118,
  endKeys: 2_308,
  thesaurusHeads: 54_672,
  synonymSeats: 403_636,
} as const;

export const FRONT_CODE_SAMPLE = [
  "sing",
  "singer",
  "singers",
  "singing",
  "single",
  "singly",
  "sink",
  "sinking",
] as const;
