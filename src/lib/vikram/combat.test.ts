import { describe, expect, it } from "vitest";
import {
  applyDeathPip,
  applyHp,
  defaultCombat,
  parseCombat,
} from "./combat";

const defaults = { maxHp: 13, hitDiceTotal: 1 };

describe("combat", () => {
  it("starts at full hit points", () => {
    expect(defaultCombat(defaults).hp).toBe(13);
  });

  it("clamps hit points and clears death saves on recovery", () => {
    const down = applyHp({ ...defaultCombat(defaults), deathFail: 2 }, -20, 13);
    expect(down.hp).toBe(0);
    expect(down.deathFail).toBe(2);
    const up = applyHp(down, 1, 13);
    expect(up.hp).toBe(1);
    expect(up.deathFail).toBe(0);
    expect(up.deathSuccess).toBe(0);
  });

  it("cycles death-save pips", () => {
    let state = defaultCombat(defaults);
    state = applyDeathPip(state, "success");
    state = applyDeathPip(state, "success");
    state = applyDeathPip(state, "success");
    expect(state.deathSuccess).toBe(3);
    state = applyDeathPip(state, "success");
    expect(state.deathSuccess).toBe(0);
  });

  it("parses stored combat and ignores junk", () => {
    const parsed = parseCombat(
      { hp: 99, tempHp: -1, deathSuccess: 2, inspiration: 1 },
      defaults,
    );
    expect(parsed.hp).toBe(13);
    expect(parsed.tempHp).toBe(0);
    expect(parsed.deathSuccess).toBe(2);
    expect(parsed.inspiration).toBe(true);
    expect(parseCombat(null, defaults).hp).toBe(13);
  });
});
