export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type CardColor = "red" | "black";
export type Verdict = "do" | "dont";

export type PlayingCard = {
  id: string;
  rank: Rank;
  suit: Suit;
  color: CardColor;
  verdict: Verdict;
};

export type DeckState = {
  remaining: PlayingCard[];
  drawn: PlayingCard[];
};

const SUIT_GLYPH: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export function cardColor(suit: Suit): CardColor {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

export function cardVerdict(color: CardColor): Verdict {
  return color === "red" ? "do" : "dont";
}

export function suitGlyph(suit: Suit): string {
  return SUIT_GLYPH[suit];
}

export function makeCard(rank: Rank, suit: Suit): PlayingCard {
  const color = cardColor(suit);
  return {
    id: `${rank}-${suit}`,
    rank,
    suit,
    color,
    verdict: cardVerdict(color),
  };
}

export function fullDeck(): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(makeCard(rank, suit));
    }
  }
  return cards;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const left = next[i];
    const right = next[j];
    if (left === undefined || right === undefined) continue;
    next[i] = right;
    next[j] = left;
  }
  return next;
}

export function freshDeck(random: () => number = Math.random): DeckState {
  return { remaining: shuffle(fullDeck(), random), drawn: [] };
}

function refillIfEmpty(state: DeckState, random: () => number): DeckState {
  if (state.remaining.length > 0) return state;
  return { remaining: shuffle(fullDeck(), random), drawn: state.drawn };
}

export function drawCard(state: DeckState, random: () => number = Math.random): DeckState {
  const ready = refillIfEmpty(state, random);
  const [card, ...rest] = ready.remaining;
  if (!card) return ready;
  return { remaining: rest, drawn: [card, ...ready.drawn] };
}

export function palmCard(
  state: DeckState,
  color: CardColor,
  random: () => number = Math.random,
): DeckState {
  let ready = refillIfEmpty(state, random);
  let index = ready.remaining.findIndex((card) => card.color === color);
  if (index < 0) {
    ready = { remaining: shuffle(fullDeck(), random), drawn: ready.drawn };
    index = ready.remaining.findIndex((card) => card.color === color);
  }
  if (index < 0) return ready;
  const card = ready.remaining[index];
  if (!card) return ready;
  const remaining = ready.remaining.filter((_, i) => i !== index);
  return { remaining, drawn: [card, ...ready.drawn] };
}

export function formatCard(card: PlayingCard): string {
  return `${card.rank}${suitGlyph(card.suit)}`;
}
