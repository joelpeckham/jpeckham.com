export type CombatState = {
  hp: number;
  tempHp: number;
  hitDiceUsed: number;
  deathSuccess: number;
  deathFail: number;
  inspiration: boolean;
};

export type CombatDefaults = {
  maxHp: number;
  hitDiceTotal: number;
};

export function defaultCombat(defaults: CombatDefaults): CombatState {
  return {
    hp: defaults.maxHp,
    tempHp: 0,
    hitDiceUsed: 0,
    deathSuccess: 0,
    deathFail: 0,
    inspiration: false,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function applyHp(state: CombatState, delta: number, maxHp: number): CombatState {
  const hp = clamp(state.hp + delta, 0, maxHp);
  if (hp > 0) {
    return { ...state, hp, deathSuccess: 0, deathFail: 0 };
  }
  return { ...state, hp };
}

export function cyclePip(value: number, max = 3): number {
  return value >= max ? 0 : value + 1;
}

export function applyDeathPip(
  state: CombatState,
  kind: "success" | "fail",
): CombatState {
  if (kind === "success") {
    return { ...state, deathSuccess: cyclePip(state.deathSuccess) };
  }
  return { ...state, deathFail: cyclePip(state.deathFail) };
}

export function parseCombat(value: unknown, defaults: CombatDefaults): CombatState {
  const fallback = defaultCombat(defaults);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<CombatState>;
  return {
    hp: clamp(Number(raw.hp ?? fallback.hp), 0, defaults.maxHp),
    tempHp: clamp(Number(raw.tempHp ?? 0), 0, 99),
    hitDiceUsed: clamp(Number(raw.hitDiceUsed ?? 0), 0, defaults.hitDiceTotal),
    deathSuccess: clamp(Number(raw.deathSuccess ?? 0), 0, 3),
    deathFail: clamp(Number(raw.deathFail ?? 0), 0, 3),
    inspiration: Boolean(raw.inspiration),
  };
}
