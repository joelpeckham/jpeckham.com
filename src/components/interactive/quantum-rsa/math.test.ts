import { describe, expect, it } from "vitest";
import {
  RSA_PRESETS,
  decrypt,
  encrypt,
  gcd,
  groupGN,
  modInverse,
  modPow,
  order,
  powerLadder,
} from "./math";

describe("RSA_PRESETS", () => {
  it("matches p·q, φ, and cd ≡ 1 (mod φ)", () => {
    for (const k of RSA_PRESETS) {
      expect(k.p * k.q).toBe(k.N);
      expect((k.p - 1) * (k.q - 1)).toBe(k.phi);
      expect(gcd(k.c, k.phi)).toBe(1);
      expect((k.c * k.d) % k.phi).toBe(1);
    }
  });
});

describe("encrypt / decrypt round-trip", () => {
  it("recovers every a in G_N for each preset", () => {
    for (const k of RSA_PRESETS) {
      for (const a of groupGN(k.N)) {
        const b = encrypt(a, k.c, k.N);
        expect(decrypt(b, k.d, k.N)).toBe(a);
      }
    }
  });
});

describe("period attack (Mermin Table 3.1)", () => {
  it("recovers a from order of b without factors", () => {
    for (const k of RSA_PRESETS) {
      for (const a of groupGN(k.N)) {
        if (a === 1) continue;
        const b = encrypt(a, k.c, k.N);
        const r = order(b, k.N);
        expect(r).not.toBeNull();
        expect(order(a, k.N)).toBe(r);
        const dPrime = modInverse(k.c, r!);
        expect(dPrime).not.toBeNull();
        expect(modPow(b, dPrime!, k.N)).toBe(a);
      }
    }
  });
});

describe("order / powerLadder", () => {
  it("matches the TryIt example: order(8) mod 15 is 4", () => {
    expect(powerLadder(8, 15)).toEqual([8, 4, 2, 1]);
    expect(order(8, 15)).toBe(4);
    expect(modInverse(3, 4)).toBe(3);
    expect(modPow(8, 3, 15)).toBe(2);
  });

  it("rejects bases outside G_N", () => {
    expect(order(3, 15)).toBeNull();
    expect(order(0, 15)).toBeNull();
  });
});
