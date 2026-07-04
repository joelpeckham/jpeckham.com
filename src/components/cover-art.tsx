import type { CSSProperties } from "react";
import type { CoverArtSpec, CoverBg, CoverIcon } from "@/lib/content";

/**
 * Maps a coordinate in the 1200-wide design space to a CSS length.
 * Cards pass a container-query unit fn so covers scale fluidly; the OG route
 * passes fixed px. Everything below is sized through `u()` so one layout
 * renders identically at both sizes.
 */
export type Unit = (n: number) => string;

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;

type Palette = { bg: string; fg: string; a1: string; a2: string };

const palettes: Record<CoverBg, Palette> = {
  red: { bg: "#e1352a", fg: "#f1ebdd", a1: "#f7c000", a2: "#141210" },
  blue: { bg: "#1f45d8", fg: "#f1ebdd", a1: "#f7c000", a2: "#e1352a" },
  yellow: { bg: "#f7c000", fg: "#141210", a1: "#e1352a", a2: "#1f45d8" },
  ink: { bg: "#141210", fg: "#f1ebdd", a1: "#f7c000", a2: "#e1352a" },
  paper: { bg: "#f1ebdd", fg: "#141210", a1: "#e1352a", a2: "#1f45d8" },
};

// ---------------------------------------------------------------------------
// Icons — chunky geometric marks drawn in a self-contained 0..100 viewBox so
// they scale with the SVG width/height regardless of the design-unit system.
// Only primitives that satori supports (rect/circle/line/path/polyline).
// ---------------------------------------------------------------------------

function Qr({ color }: { color: string }) {
  const b = color;
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <rect x="6" y="6" width="30" height="30" stroke={b} strokeWidth="8" />
      <rect x="18" y="18" width="6" height="6" fill={b} />
      <rect x="64" y="6" width="30" height="30" stroke={b} strokeWidth="8" />
      <rect x="76" y="18" width="6" height="6" fill={b} />
      <rect x="6" y="64" width="30" height="30" stroke={b} strokeWidth="8" />
      <rect x="18" y="76" width="6" height="6" fill={b} />
      <rect x="52" y="52" width="12" height="12" fill={b} />
      <rect x="76" y="52" width="12" height="12" fill={b} />
      <rect x="52" y="76" width="12" height="12" fill={b} />
      <rect x="82" y="82" width="12" height="12" fill={b} />
    </svg>
  );
}

function Calendar({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <rect x="8" y="16" width="84" height="76" stroke={color} strokeWidth="8" />
      <rect x="8" y="16" width="84" height="20" fill={color} />
      <rect x="26" y="6" width="8" height="20" fill={color} />
      <rect x="66" y="6" width="8" height="20" fill={color} />
      <rect x="22" y="48" width="14" height="14" fill={accent} />
      <rect x="44" y="48" width="14" height="14" fill={color} />
      <rect x="66" y="48" width="14" height="14" fill={color} />
      <rect x="22" y="70" width="14" height="14" fill={color} />
      <rect x="44" y="70" width="14" height="14" fill={accent} />
      <rect x="66" y="70" width="14" height="14" fill={color} />
    </svg>
  );
}

function Network({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <line x1="20" y1="22" x2="50" y2="14" stroke={color} strokeWidth="5" />
      <line x1="20" y1="22" x2="50" y2="50" stroke={color} strokeWidth="5" />
      <line x1="20" y1="78" x2="50" y2="50" stroke={color} strokeWidth="5" />
      <line x1="20" y1="78" x2="50" y2="86" stroke={color} strokeWidth="5" />
      <line x1="50" y1="14" x2="82" y2="34" stroke={color} strokeWidth="5" />
      <line x1="50" y1="50" x2="82" y2="34" stroke={color} strokeWidth="5" />
      <line x1="50" y1="50" x2="82" y2="66" stroke={color} strokeWidth="5" />
      <line x1="50" y1="86" x2="82" y2="66" stroke={color} strokeWidth="5" />
      <circle cx="20" cy="22" r="9" fill={color} />
      <circle cx="20" cy="78" r="9" fill={color} />
      <circle cx="50" cy="14" r="9" fill={accent} />
      <circle cx="50" cy="50" r="11" fill={accent} />
      <circle cx="50" cy="86" r="9" fill={accent} />
      <circle cx="82" cy="34" r="9" fill={color} />
      <circle cx="82" cy="66" r="9" fill={color} />
    </svg>
  );
}

function Puzzle({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <rect x="8" y="8" width="84" height="84" stroke={color} strokeWidth="8" />
      <line x1="36" y1="8" x2="36" y2="92" stroke={color} strokeWidth="6" />
      <line x1="64" y1="8" x2="64" y2="92" stroke={color} strokeWidth="6" />
      <line x1="8" y1="36" x2="92" y2="36" stroke={color} strokeWidth="6" />
      <line x1="8" y1="64" x2="92" y2="64" stroke={color} strokeWidth="6" />
      <rect x="66" y="66" width="26" height="26" fill={accent} />
      <rect x="14" y="14" width="16" height="16" fill={color} />
      <rect x="42" y="70" width="16" height="16" fill={color} />
    </svg>
  );
}

function Stack({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <rect x="12" y="66" width="76" height="18" fill={color} />
      <rect x="12" y="42" width="76" height="18" fill={accent} />
      <rect x="12" y="18" width="76" height="18" fill={color} />
    </svg>
  );
}

function Newspaper({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="14" width="80" height="72" stroke={color} strokeWidth="8" />
      <rect x="20" y="24" width="34" height="10" fill={color} />
      <rect x="20" y="42" width="34" height="6" fill={color} />
      <rect x="20" y="54" width="34" height="6" fill={color} />
      <rect x="20" y="66" width="24" height="6" fill={color} />
      <rect x="64" y="66" width="8" height="12" fill={accent} />
      <rect x="74" y="54" width="8" height="24" fill={accent} />
      <rect x="64" y="30" width="18" height="18" stroke={accent} strokeWidth="6" />
    </svg>
  );
}

function Icon({
  name,
  color,
  accent,
}: {
  name: CoverIcon;
  color: string;
  accent: string;
}) {
  switch (name) {
    case "qr":
      return <Qr color={color} />;
    case "calendar":
      return <Calendar color={color} accent={accent} />;
    case "network":
      return <Network color={color} accent={accent} />;
    case "puzzle":
      return <Puzzle color={color} accent={accent} />;
    case "stack":
      return <Stack color={color} accent={accent} />;
    case "newspaper":
      return <Newspaper color={color} accent={accent} />;
  }
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

export type CoverArtProps = {
  art: CoverArtSpec;
  u: Unit;
  label?: string;
  /** Font-family strings differ between web (CSS vars) and OG (loaded fonts). */
  fontDisplay?: string;
  fontMono?: string;
};

export function CoverArt({
  art,
  u,
  label,
  fontDisplay = '"Jost", "Futura", system-ui, sans-serif',
  fontMono = '"JetBrains Mono", ui-monospace, monospace',
}: CoverArtProps) {
  const p = palettes[art.bg];
  const eyebrow = (label ?? art.label ?? "").toUpperCase();

  const headlineStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    fontFamily: fontDisplay,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: u(-14),
    lineHeight: 0.82,
  };

  const eyebrowStyle: CSSProperties = {
    display: "flex",
    fontFamily: fontMono,
    fontWeight: 500,
    fontSize: u(30),
    letterSpacing: u(6),
    textTransform: "uppercase",
    color: p.fg,
  };

  const root: CSSProperties = {
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%",
    background: p.bg,
    color: p.fg,
    overflow: "hidden",
  };

  if (art.variant === "split") {
    const line = (t: string) => (
      <div key={t} style={{ display: "flex" }}>
        {t}
      </div>
    );
    return (
      <div style={{ ...root, alignItems: "center", padding: u(70) }}>
        <CornerBlocks u={u} a1={p.a1} a2={p.a2} />
        <div
          style={{
            display: "flex",
            width: u(300),
            height: u(300),
            flexShrink: 0,
            marginRight: u(56),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={art.icon} color={p.fg} accent={p.a1} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: u(20) }}
        >
          {eyebrow ? <div style={eyebrowStyle}>{eyebrow}</div> : null}
          <div style={{ ...headlineStyle, fontSize: u(150) }}>
            {art.headline.map(line)}
          </div>
        </div>
      </div>
    );
  }

  if (art.variant === "band") {
    const line = (t: string) => (
      <div key={t} style={{ display: "flex" }}>
        {t}
      </div>
    );
    return (
      <div
        style={{
          ...root,
          flexDirection: "column",
          justifyContent: "center",
          padding: u(70),
          paddingBottom: u(150),
        }}
      >
        {/* Accent stripe along the bottom edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: u(90),
            background: p.a1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: u(56),
            right: u(64),
            display: "flex",
            width: u(190),
            height: u(190),
          }}
        >
          <Icon name={art.icon} color={p.fg} accent={p.a2} />
        </div>
        {eyebrow ? (
          <div style={{ ...eyebrowStyle, marginBottom: u(18) }}>{eyebrow}</div>
        ) : null}
        <div
          style={{
            ...headlineStyle,
            fontSize: u(180),
            color: art.bg === "yellow" ? "#141210" : p.fg,
          }}
        >
          {art.headline.map(line)}
        </div>
      </div>
    );
  }

  // variant === "stamp": oversized type with the icon stamped over a corner.
  const line = (t: string) => (
    <div key={t} style={{ display: "flex" }}>
      {t}
    </div>
  );
  return (
    <div
      style={{
        ...root,
        flexDirection: "column",
        justifyContent: "center",
        padding: u(70),
      }}
    >
      <div
        style={{
          position: "absolute",
          right: u(-40),
          bottom: u(-40),
          display: "flex",
          width: u(340),
          height: u(340),
          opacity: 0.96,
        }}
      >
        <Icon name={art.icon} color={p.a1} accent={p.a2} />
      </div>
      {eyebrow ? (
        <div style={{ ...eyebrowStyle, marginBottom: u(18) }}>{eyebrow}</div>
      ) : null}
      <div style={{ ...headlineStyle, fontSize: u(210) }}>
        {art.headline.map(line)}
      </div>
    </div>
  );
}

function CornerBlocks({
  u,
  a1,
  a2,
}: {
  u: Unit;
  a1: string;
  a2: string;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: u(40),
          right: u(40),
          display: "flex",
          width: u(64),
          height: u(64),
          background: a1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: u(40),
          right: u(120),
          display: "flex",
          width: u(64),
          height: u(64),
          borderRadius: u(64),
          background: a2,
        }}
      />
    </>
  );
}
