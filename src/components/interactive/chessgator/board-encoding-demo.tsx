"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BOARD_PRESETS,
  CHANNEL_LABELS,
  channelPlane,
  modelPiecesForFen,
  occupiedSquares,
  parseFen,
  tokenizeFen,
  type PieceChar,
} from "./model";
import { Chip, DemoShell, Panel } from "./shared";

const LIGHT = "bg-white";
const DARK = "bg-ink/12";

function pieceGlyph(piece: PieceChar): string {
  return piece;
}

function MiniBoard({
  pieces,
  label,
  dimEmpty,
}: {
  pieces: ReadonlyArray<PieceChar | null>;
  label: string;
  dimEmpty?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
        {label}
      </p>
      <div
        className="grid aspect-square w-full max-w-55 grid-cols-8 border-2 border-ink"
        role="img"
        aria-label={label}
      >
        {Array.from({ length: 64 }, (_, display) => {
          const file = display % 8;
          const rankFromTop = Math.floor(display / 8);
          const rank = 7 - rankFromTop;
          const index = file + rank * 8;
          const piece = pieces[index] ?? null;
          const dark = (file + rank) % 2 === 0;
          const isWhite = piece !== null && piece === piece.toUpperCase();
          return (
            <div
              key={display}
              className={cn(
                "flex items-center justify-center font-mono text-[11px] leading-none sm:text-xs",
                dark ? DARK : LIGHT,
                piece
                  ? isWhite
                    ? "font-bold text-ink"
                    : "font-bold text-ink/70"
                  : dimEmpty
                    ? "opacity-40"
                    : "",
              )}
            >
              {piece ? pieceGlyph(piece) : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelGrid({
  plane,
  label,
  active,
}: {
  plane: Uint8Array;
  label: string;
  active: boolean;
}) {
  return (
    <div className={cn("space-y-1", !active && "opacity-35")}>
      <p className="text-center font-mono text-[10px] text-grey">{label}</p>
      <div className="grid aspect-square w-full grid-cols-8 border border-ink/40">
        {Array.from({ length: 64 }, (_, display) => {
          const file = display % 8;
          const rank = 7 - Math.floor(display / 8);
          const on = plane[file + rank * 8] === 1;
          return (
            <div
              key={display}
              className={cn(on ? "bg-blue" : "bg-white")}
            />
          );
        })}
      </div>
    </div>
  );
}

export function BoardEncodingDemo() {
  const [presetId, setPresetId] = useState(BOARD_PRESETS[1]!.id);
  const [mirrorBlack, setMirrorBlack] = useState(true);

  const preset = BOARD_PRESETS.find((p) => p.id === presetId) ?? BOARD_PRESETS[1]!;
  const parsed = useMemo(() => parseFen(preset.fen), [preset.fen]);
  const modelPieces = useMemo(
    () => modelPiecesForFen(preset.fen, { mirrorBlack }),
    [preset.fen, mirrorBlack],
  );
  const tokens = useMemo(
    () => tokenizeFen(preset.fen, { mirrorBlack }),
    [preset.fen, mirrorBlack],
  );
  const mirrored = parsed.turn === "b" && mirrorBlack;
  const skipped = parsed.turn === "b" && !mirrorBlack;

  return (
    <DemoShell
      title="What Maia actually sees"
      blurb="64 squares × 12 piece channels. When Black is to move the board is flipped and recolored so the side to move is always White."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {BOARD_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={presetId === p.id ? "ink" : "outline"}
            onClick={() => setPresetId(p.id)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={mirrorBlack ? "blue" : "outline"}
          onClick={() => setMirrorBlack((v) => !v)}
        >
          {mirrorBlack ? "Mirror on" : "Mirror off"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip tone={parsed.turn === "w" ? "ok" : "warn"}>
          {parsed.turn === "w" ? "White to move" : "Black to move"}
        </Chip>
        <Chip tone={mirrored ? "ok" : skipped ? "bad" : "ink"}>
          {mirrored
            ? "Mirrored for the net"
            : skipped
              ? "Mirror skipped"
              : "No mirror needed"}
        </Chip>
        <Chip>{occupiedSquares(tokens)} occupied squares</Chip>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MiniBoard pieces={parsed.pieces} label="Real board" />
        <MiniBoard
          pieces={modelPieces}
          label="Token space"
          dimEmpty
        />
      </div>

      <Panel label="12 one-hot planes (P N B R Q K p n b r q k)">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {CHANNEL_LABELS.map((label, channel) => {
            const plane = channelPlane(tokens, channel);
            const hits = plane.reduce((n, v) => n + v, 0);
            return (
              <ChannelGrid
                key={label}
                plane={plane}
                label={label}
                active={hits > 0}
              />
            );
          })}
        </div>
      </Panel>

      <p className="text-sm text-grey">{preset.note}</p>
      {skipped ? (
        <p className="text-sm text-red">
          Without the mirror, Black-to-move positions are fed in as if White
          were to move. The 5M net was never trained on that, so the policy is
          junk.
        </p>
      ) : null}
    </DemoShell>
  );
}
