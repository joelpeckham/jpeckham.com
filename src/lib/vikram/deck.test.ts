import { describe, expect, it } from "vitest";
import {
  drawCard,
  formatCard,
  freshDeck,
  fullDeck,
  makeCard,
  palmCard,
} from "./deck";

function sequence(values: number[]) {
  let i = 0;
  return () => {
    const value = values[i] ?? 0;
    i += 1;
    return value;
  };
}

describe("deck", () => {
  it("has 52 unique cards", () => {
    const cards = fullDeck();
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(52);
    expect(cards.filter((card) => card.color === "red")).toHaveLength(26);
    expect(cards.filter((card) => card.verdict === "do")).toHaveLength(26);
  });

  it("draws from the top and records history", () => {
    const ace = makeCard("A", "hearts");
    const two = makeCard("2", "spades");
    const next = drawCard({ remaining: [ace, two], drawn: [] });
    expect(next.drawn[0]).toEqual(ace);
    expect(next.remaining).toEqual([two]);
    expect(formatCard(ace)).toBe("A♥");
  });

  it("refills an empty deck before drawing", () => {
    const next = drawCard({ remaining: [], drawn: [] }, sequence([0]));
    expect(next.drawn).toHaveLength(1);
    expect(next.remaining).toHaveLength(51);
  });

  it("palms a card of the requested color", () => {
    const red = makeCard("A", "hearts");
    const black = makeCard("K", "spades");
    const next = palmCard({ remaining: [black, red], drawn: [] }, "red");
    expect(next.drawn[0]?.color).toBe("red");
    expect(next.remaining).toEqual([black]);
  });

  it("reshuffles when the requested color is gone", () => {
    const next = palmCard(
      { remaining: [makeCard("A", "spades")], drawn: [] },
      "red",
      sequence([0, 0, 0]),
    );
    expect(next.drawn[0]?.color).toBe("red");
    expect(freshDeck(() => 0).remaining).toHaveLength(52);
  });
});
