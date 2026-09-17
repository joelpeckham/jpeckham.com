"use client";

import { useEffect, useState } from "react";
import { signed, vikram } from "@/lib/vikram/character";
import {
  applyDeathPip,
  applyHp,
  defaultCombat,
  parseCombat,
  type CombatState,
} from "@/lib/vikram/combat";
import {
  drawCard,
  formatCard,
  freshDeck,
  palmCard,
  suitGlyph,
  type CardColor,
  type DeckState,
} from "@/lib/vikram/deck";

const COMBAT_KEY = "vikram-table-combat-v1";
const defaults = { maxHp: vikram.maxHp, hitDiceTotal: vikram.hitDiceTotal };

type Tab = "play" | "cards" | "story";

function loadCombat(): CombatState {
  try {
    const raw = sessionStorage.getItem(COMBAT_KEY) ?? localStorage.getItem(COMBAT_KEY);
    return parseCombat(raw ? JSON.parse(raw) : null, defaults);
  } catch {
    return defaultCombat(defaults);
  }
}

function Pips({
  value,
  kind,
  label,
  onCycle,
}: {
  value: number;
  kind: "ok" | "fail";
  label: string;
  onCycle: () => void;
}) {
  return (
    <button type="button" className="flex items-center gap-1.5" onClick={onCycle}>
      <span className="vk-kicker">{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className="vk-pip" data-kind={kind} data-on={i < value ? "true" : "false"} />
        ))}
      </span>
      <span className="sr-only">
        {value} of 3 {label}. Tap to cycle.
      </span>
    </button>
  );
}

function PlayTab() {
  const trained = vikram.skills.filter((skill) => skill.proficient);
  const other = vikram.skills.filter((skill) => !skill.proficient);

  return (
    <div className="grid gap-4">
      <section className="grid grid-cols-6 gap-1.5">
        {vikram.abilities.map((ability) => (
          <div key={ability.id} className="vk-ability">
            <span className="vk-kicker">{ability.label}</span>
            <strong>{ability.score}</strong>
            <span className="text-sm text-[var(--vk-muted)]">{signed(ability.mod)}</span>
            <span
              className="text-[0.68rem] tracking-wide"
              style={{ color: ability.saveProficient ? "var(--vk-gold-2)" : "var(--vk-muted)" }}
            >
              sv {signed(ability.save)}
            </span>
          </div>
        ))}
      </section>

      <section className="vk-panel">
        <p className="vk-kicker">Attacks</p>
        <ul className="mt-3 grid gap-3">
          {vikram.attacks.map((attack) => (
            <li key={attack.name}>
              <div className="flex items-baseline justify-between gap-3">
                <strong className="vk-title text-xl">{attack.name}</strong>
                <span className="font-medium text-[var(--vk-gold-2)]">
                  {attack.bonus} · {attack.damage}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--vk-muted)]">{attack.notes}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--vk-muted)]">
          Sneak Attack +1d6 once per turn. Savage Attacker: reroll weapon damage once per turn,
          keep either.
        </p>
      </section>

      <section className="vk-panel">
        <p className="vk-kicker">Trained skills</p>
        <ul className="mt-2">
          {trained.map((skill) => (
            <li key={skill.name} className="vk-skill" data-trained="true">
              <span className="vk-mark">{skill.expertise ? "E" : "P"}</span>
              <span>
                {skill.name}{" "}
                <span className="text-[var(--vk-muted)] uppercase">{skill.ability}</span>
              </span>
              <strong>{signed(skill.bonus)}</strong>
            </li>
          ))}
        </ul>
        <p className="vk-kicker mt-4">The rest</p>
        <ul className="mt-2">
          {other.map((skill) => (
            <li key={skill.name} className="vk-skill">
              <span className="vk-mark">·</span>
              <span>
                {skill.name}{" "}
                <span className="text-[var(--vk-muted)] uppercase">{skill.ability}</span>
              </span>
              <span>{signed(skill.bonus)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="vk-panel">
        <p className="vk-kicker">Features</p>
        <div className="mt-2 grid gap-3">
          {vikram.features.map((feature) => (
            <div key={feature.name} className="border-b border-[rgba(196,165,116,0.12)] pb-3 last:border-b-0 last:pb-0">
              <p>
                <span className="vk-title text-xl">{feature.name}</span>
                <span className="ml-2 text-sm text-[var(--vk-muted)]">{feature.source}</span>
              </p>
              <p className="mt-1">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vk-panel">
        <p className="vk-kicker">Kit</p>
        <p className="mt-2">
          {vikram.gear.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
        </p>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">
          {vikram.money.gp} gp · {vikram.tools.join(", ")}
        </p>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">{vikram.languages.join(" · ")}</p>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">
          Armor: {vikram.armorTraining.join(", ")}. Weapons: {vikram.weaponTraining.join(", ")}.
        </p>
      </section>
    </div>
  );
}

function CardsTab({
  deck,
  onDraw,
  onPalm,
  onShuffle,
}: {
  deck: DeckState;
  onDraw: () => void;
  onPalm: (color: CardColor) => void;
  onShuffle: () => void;
}) {
  const current = deck.drawn[0];
  const history = deck.drawn.slice(0, 8);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <button type="button" className="vk-solid min-h-14 text-lg" onClick={onDraw}>
          Draw
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="vk-ghost" onClick={() => onPalm("red")}>
            Palm red
          </button>
          <button type="button" className="vk-ghost" onClick={() => onPalm("black")}>
            Palm black
          </button>
          <button type="button" className="vk-ghost" onClick={onShuffle}>
            Shuffle
          </button>
        </div>
      </div>

      <div
        className="vk-card"
        data-empty={current ? "false" : "true"}
        data-color={current?.color}
        aria-live="polite"
      >
        {current ? (
          <div className="grid justify-items-center gap-2 text-center">
            <span className="vk-kicker" style={{ color: "inherit" }}>
              {current.verdict === "do" ? "Do it" : "Don't"}
            </span>
            <strong className="vk-title text-7xl leading-none">{current.rank}</strong>
            <span className="text-4xl" aria-hidden="true">
              {suitGlyph(current.suit)}
            </span>
          </div>
        ) : (
          <p className="max-w-48 text-center">
            When he is genuinely uncertain, he draws. Red: do it. Black: don’t.
          </p>
        )}
      </div>

      <section className="vk-panel">
        <p className="vk-kicker">The cheat</p>
        <p className="mt-2">I didn’t change the outcome. I changed the odds.</p>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">
          He does not believe the cards control fate. A black card he immediately hates tells him
          what he wanted. Sometimes he just says “cards don’t lie” and does what it says.
        </p>
        {history.length > 0 ? (
          <ol className="mt-3 grid gap-1 text-sm text-[var(--vk-muted)]">
            {history.map((card, index) => (
              <li key={`${card.id}-${index}`}>
                {formatCard(card)} · {card.verdict === "do" ? "do it" : "don’t"}
                {index === 0 ? " · now" : ""}
              </li>
            ))}
          </ol>
        ) : null}
        <p className="mt-3 text-sm text-[var(--vk-muted)]">
          {deck.remaining.length === 0 && deck.drawn.length === 0
            ? "Fresh deck of 52."
            : `${deck.remaining.length} left in the deck.`}
        </p>
      </section>
    </div>
  );
}

function StoryTab() {
  return (
    <div className="grid gap-4">
      <section className="vk-panel">
        <p className="vk-kicker">Who he is</p>
        <h2 className="vk-title mt-2 text-3xl">{vikram.name}</h2>
        <p className="mt-2 text-[var(--vk-muted)]">
          {vikram.occupation}. {vikram.home}. {vikram.appearance}
        </p>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">
          {vikram.alignment} · {vikram.age} · {vikram.size} · {vikram.height} · {vikram.weight}
        </p>
      </section>

      <section className="vk-panel grid gap-3">
        <div>
          <p className="vk-kicker">Trait</p>
          <p className="mt-1">{vikram.personality.trait}</p>
        </div>
        <div>
          <p className="vk-kicker">Ideal — freedom</p>
          <p className="mt-1">{vikram.personality.ideal}</p>
        </div>
        <div>
          <p className="vk-kicker">Bond</p>
          <p className="mt-1">{vikram.personality.bond}</p>
        </div>
        <div>
          <p className="vk-kicker">Flaw</p>
          <p className="mt-1">{vikram.personality.flaw}</p>
        </div>
      </section>

      {vikram.people.map((person) => (
        <section key={person.name} className="vk-panel">
          <p className="vk-kicker">{person.relation}</p>
          <h3 className="vk-title mt-1 text-2xl">{person.name}</h3>
          <p className="mt-2">{person.text}</p>
        </section>
      ))}

      <section className="vk-panel">
        <p className="vk-kicker">Remember</p>
        <ul className="mt-2 grid gap-2">
          {vikram.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function VikramApp() {
  const [tab, setTab] = useState<Tab>("play");
  const [combat, setCombat] = useState<CombatState>(() => defaultCombat(defaults));
  const [deck, setDeck] = useState<DeckState>({ remaining: [], drawn: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCombat(loadCombat());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify(combat);
    localStorage.setItem(COMBAT_KEY, payload);
    sessionStorage.setItem(COMBAT_KEY, payload);
  }, [combat, ready]);

  const down = combat.hp <= 0;
  const trainedPassives = `Perc ${vikram.passivePerception} · Inv ${vikram.passiveInvestigation} · Insight ${vikram.passiveInsight}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="vk-hud px-4 pb-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="vk-kicker">{vikram.kicker}</p>
            <h1 className="vk-title mt-1 text-3xl sm:text-4xl">{vikram.name}</h1>
            <p className="mt-1 text-sm text-[var(--vk-muted)]">
              {vikram.classLevel} · {vikram.species} · {vikram.background}
            </p>
          </div>
          <button
            type="button"
            className="vk-ghost"
            onClick={() => setCombat(defaultCombat(defaults))}
          >
            Reset
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="vk-icon"
              aria-label="Lose 1 hit point"
              onClick={() => setCombat((state) => applyHp(state, -1, vikram.maxHp))}
            >
              −
            </button>
            <div className="min-w-16 text-center">
              <p className="vk-kicker">HP</p>
              <p className="vk-title text-3xl">
                {combat.hp}
                <span className="text-lg text-[var(--vk-muted)]">/{vikram.maxHp}</span>
              </p>
            </div>
            <button
              type="button"
              className="vk-icon"
              aria-label="Gain 1 hit point"
              onClick={() => setCombat((state) => applyHp(state, 1, vikram.maxHp))}
            >
              +
            </button>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <dt className="vk-kicker">AC</dt>
              <dd className="vk-title text-2xl">{vikram.ac}</dd>
            </div>
            <div>
              <dt className="vk-kicker">Init</dt>
              <dd className="vk-title text-2xl">{signed(vikram.initiative)}</dd>
            </div>
            <div>
              <dt className="vk-kicker">Speed</dt>
              <dd className="vk-title text-2xl">{vikram.speed.replace(" ft", "")}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Pips
            value={combat.deathSuccess}
            kind="ok"
            label="Stable"
            onCycle={() => setCombat((state) => applyDeathPip(state, "success"))}
          />
          <Pips
            value={combat.deathFail}
            kind="fail"
            label="Fail"
            onCycle={() => setCombat((state) => applyDeathPip(state, "fail"))}
          />
          <button
            type="button"
            className="vk-ghost"
            data-active={combat.inspiration ? "true" : "false"}
            aria-pressed={combat.inspiration}
            onClick={() =>
              setCombat((state) => ({ ...state, inspiration: !state.inspiration }))
            }
          >
            Insp
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--vk-muted)]">
          Prof {signed(vikram.proficiencyBonus)} · {vikram.hitDice} · {trainedPassives}
          {down ? " · down" : ""}
          {combat.tempHp > 0 ? ` · temp ${combat.tempHp}` : ""}
        </p>
      </header>

      <main className="flex-1 px-4 py-4 sm:px-6">
        {tab === "play" ? <PlayTab /> : null}
        {tab === "cards" ? (
          <CardsTab
            deck={deck}
            onDraw={() => setDeck((state) => drawCard(state))}
            onPalm={(color) => setDeck((state) => palmCard(state, color))}
            onShuffle={() => setDeck(freshDeck())}
          />
        ) : null}
        {tab === "story" ? <StoryTab /> : null}
      </main>

      <nav className="vk-tabs px-4 sm:px-6" aria-label="Vikram sections">
        {(
          [
            ["play", "Play"],
            ["cards", "Cards"],
            ["story", "Story"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="vk-tab"
            data-active={tab === id ? "true" : "false"}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
