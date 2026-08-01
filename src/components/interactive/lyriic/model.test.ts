import { describe, expect, it } from "vitest";
import {
  bucketFor,
  demoSyllableCount,
  endKeyStartIndex,
  frontCodeWords,
  packStressPattern,
  perfectKeyStartIndex,
  unpackStressPattern,
} from "./model";

describe("packStressPattern", () => {
  it("packs banana as 0,1,0 into low bits", () => {
    const packed = packStressPattern([0, 1, 0]);
    expect(packed).toBe(0b000100); // syllable0=00, syllable1=01, syllable2=00
    expect(unpackStressPattern(packed, 3)).toEqual([0, 1, 0]);
  });

  it("packs primary-only monosyllable", () => {
    expect(packStressPattern([1])).toBe(0b01);
    expect(unpackStressPattern(1, 1)).toEqual([1]);
  });
});

describe("frontCodeWords", () => {
  it("shares prefixes on a sorted sing* cluster", () => {
    const { entries, rawTotal, storedTotal } = frontCodeWords([
      "sing",
      "singer",
      "singers",
      "singing",
      "single",
      "singly",
      "sink",
      "sinking",
    ]);
    expect(entries[0]).toMatchObject({ word: "sing", shared: 0, rest: "sing" });
    expect(entries[1]).toMatchObject({ word: "singer", shared: 4, rest: "er" });
    // Header bytes can lose on tiny lists; the demo cluster still nets a win.
    expect(storedTotal).toBeLessThan(rawTotal);
  });
});

describe("rhyme keys", () => {
  it("cuts perfect rhyme from last primary stress", () => {
    const desire = [
      { phone: "d", isVowel: false },
      { phone: "ɪ", isVowel: true, stress: 0 as const },
      { phone: "z", isVowel: false },
      { phone: "aɪ", isVowel: true, stress: 1 as const },
      { phone: "ɚ", isVowel: true, stress: 0 as const },
    ];
    expect(perfectKeyStartIndex(desire)).toBe(3);
    expect(endKeyStartIndex(desire)).toBe(4);
  });

  it("puts fun and anyone in the same end bucket", () => {
    const fun = {
      word: "fun",
      phones: [],
      perfectKey: "ʌn",
      endKey: "ʌn",
      syllables: 1,
      stress: [1 as const],
    };
    const bucket = bucketFor(fun, "end").map((w) => w.word);
    expect(bucket).toContain("anyone");
    expect(bucket).toContain("someone");
  });
});

describe("demoSyllableCount", () => {
  it("knows curated demo words", () => {
    expect(demoSyllableCount("fire")).toBe(2);
    expect(demoSyllableCount("poetry")).toBe(3);
    expect(demoSyllableCount("beautiful")).toBe(4);
  });
});
