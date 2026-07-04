import { useCallback } from "react";
import { canMove, GOAL, SIZE, type Puzzle } from "./search";
import { cn } from "@/lib/utils";

type BoardProps = {
  puzzle: Puzzle;
  onTileClick?: (index: number) => void;
  interactive?: boolean;
};

const CELL = 100 / SIZE;

function tileIndexForKey(puzzle: Puzzle, key: string): number | null {
  const blank = puzzle.indexOf("-");
  switch (key) {
    case "ArrowUp":
      return blank + SIZE < puzzle.length ? blank + SIZE : null;
    case "ArrowDown":
      return blank - SIZE >= 0 ? blank - SIZE : null;
    case "ArrowLeft":
      return blank % SIZE < SIZE - 1 ? blank + 1 : null;
    case "ArrowRight":
      return blank % SIZE > 0 ? blank - 1 : null;
    default:
      return null;
  }
}

// A 3x3 board of tiles. Each tile is positioned absolutely from its index and
// keyed by its digit, so when the puzzle string changes React keeps the same
// DOM node and the CSS transition slides it to its new cell.
export function Board({
  puzzle,
  onTileClick,
  interactive = true,
}: BoardProps) {
  const solved = puzzle === GOAL;
  const blankIndex = puzzle.indexOf("-");

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !onTileClick) return;
      const tileIndex = tileIndexForKey(puzzle, event.key);
      if (tileIndex === null || !canMove(puzzle, tileIndex)) return;
      event.preventDefault();
      onTileClick(tileIndex);
    },
    [interactive, onTileClick, puzzle],
  );

  return (
    <div
      role="application"
      tabIndex={interactive ? 0 : undefined}
      aria-label={`8-puzzle board. Blank is at position ${blankIndex + 1} of 9. Use arrow keys or click adjacent tiles to slide them into the blank.`}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[20rem] border-2 border-ink bg-paper-2",
        interactive && "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      )}
    >
      {puzzle.split("").map((ch, index) => {
        if (ch === "-") return null;
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        const movable = interactive && canMove(puzzle, index);
        const tileStyle = {
          width: `${CELL}%`,
          height: `${CELL}%`,
          left: `${col * CELL}%`,
          top: `${row * CELL}%`,
        };
        const tileClassName = cn(
          "absolute transition-[left,top] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          movable ? "cursor-pointer" : "cursor-default",
        );
        const labelClassName = cn(
          "absolute inset-[4px] flex items-center justify-center border-2 border-ink font-display text-4xl font-black tabular-nums transition-colors",
          solved
            ? "bg-yellow text-ink"
            : movable
              ? "bg-white text-ink hover:bg-yellow"
              : "bg-white text-ink",
        );

        if (movable) {
          return (
            <button
              key={ch}
              type="button"
              onClick={() => onTileClick?.(index)}
              aria-label={`Tile ${ch} — click or use arrow keys to slide into the blank`}
              className={tileClassName}
              style={tileStyle}
            >
              <span className={labelClassName}>{ch}</span>
            </button>
          );
        }

        return (
          <div
            key={ch}
            aria-hidden="true"
            className={tileClassName}
            style={tileStyle}
          >
            <span className={labelClassName}>{ch}</span>
          </div>
        );
      })}
    </div>
  );
}
