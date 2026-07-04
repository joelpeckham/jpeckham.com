import { canMove, GOAL, SIZE, type Puzzle } from "./search";
import { cn } from "@/lib/utils";

type BoardProps = {
  puzzle: Puzzle;
  onTileClick?: (index: number) => void;
  interactive?: boolean;
};

const CELL = 100 / SIZE;

// A 3x3 board of tiles. Each tile is positioned absolutely from its index and
// keyed by its digit, so when the puzzle string changes React keeps the same
// DOM node and the CSS transition slides it to its new cell.
export function Board({
  puzzle,
  onTileClick,
  interactive = true,
}: BoardProps) {
  const solved = puzzle === GOAL;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[20rem] border-2 border-ink bg-paper-2">
      {puzzle.split("").map((ch, index) => {
        if (ch === "-") return null;
        const row = Math.floor(index / SIZE);
        const col = index % SIZE;
        const movable = interactive && canMove(puzzle, index);
        return (
          <button
            key={ch}
            type="button"
            disabled={!movable}
            onClick={() => onTileClick?.(index)}
            aria-label={`Tile ${ch}${movable ? " — click to slide into the blank" : ""}`}
            className={cn(
              "absolute transition-[left,top] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              movable ? "cursor-pointer" : "cursor-default",
            )}
            style={{
              width: `${CELL}%`,
              height: `${CELL}%`,
              left: `${col * CELL}%`,
              top: `${row * CELL}%`,
            }}
          >
            <span
              className={cn(
                "absolute inset-[4px] flex items-center justify-center border-2 border-ink font-display text-4xl font-black tabular-nums transition-colors",
                solved
                  ? "bg-yellow text-ink"
                  : movable
                    ? "bg-white text-ink hover:bg-yellow"
                    : "bg-white text-ink",
              )}
            >
              {ch}
            </span>
          </button>
        );
      })}
    </div>
  );
}
