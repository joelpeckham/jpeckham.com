import { useCallback } from "react";
import { canMove, GOAL, SIZE, type Puzzle } from "./search";
import { cn } from "@/lib/utils";

type BoardProps = {
  puzzle: Puzzle;
  onTileClick?: (index: number) => void;
  interactive?: boolean;
};

const CELL = 100 / SIZE;
const TILES = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

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

// A 3x3 board of tiles. Tiles render in fixed digit order (1–8) and are
// positioned with transform so React never reorders DOM nodes when a tile moves.
// Each tile is keyed by its digit, so the same element slides to its new cell.
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
      tabIndex={interactive ? 0 : -1}
      aria-label={`8-puzzle board. Blank at position ${blankIndex + 1} of 9. Click a neighbor tile, or use arrow keys.`}
      onKeyDown={handleKeyDown}
      className={cn(
        "@container relative mx-auto aspect-square w-full max-w-[min(100%,20rem)] touch-manipulation border-2 border-ink bg-paper-2 select-none lg:mx-0 lg:max-w-none",
        interactive &&
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      )}
    >
      {TILES.map((ch) => {
        const index = puzzle.indexOf(ch);
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        const movable = interactive && canMove(puzzle, index);
        const tileStyle = {
          width: `${CELL}%`,
          height: `${CELL}%`,
          transform: `translate(${col * 100}%, ${row * 100}%)`,
        };
        const tileClassName = cn(
          "absolute left-0 top-0 transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          movable ? "cursor-pointer" : "cursor-default",
        );
        const labelClassName = cn(
          "absolute inset-[4px] flex items-center justify-center border-2 border-ink font-display text-[clamp(1.25rem,28cqw,2.25rem)] font-black tabular-nums transition-colors sm:text-4xl",
          solved
            ? "bg-yellow text-ink"
            : movable
              ? "bg-white text-ink [@media(hover:hover)]:hover:bg-yellow active:bg-yellow"
              : "bg-white text-ink",
        );

        if (movable) {
          return (
            <button
              key={ch}
              type="button"
              onClick={() => onTileClick?.(index)}
              aria-label={`Tile ${ch}. Click or press an arrow key to slide it into the blank.`}
              className={cn(tileClassName, "touch-manipulation")}
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
