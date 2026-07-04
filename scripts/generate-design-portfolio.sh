#!/usr/bin/env bash
#
# Regenerates the design-portfolio assets from the original source PDF.
#
# The source PDF's first page is an outdated schedule/contact sheet we no longer
# want to show, so every output starts from page 2.
#
# Outputs:
#   - public/design-portfolio/page-1.svg .. page-5.svg  (source pages 2-6, one
#     vector SVG per page; text stays as real glyph paths, so it renders crisp
#     at any zoom with no full-page rasterization)
#   - public/designPortfolio.pdf  (trimmed download: source pages 2-6, content
#     streams preserved without re-encoding)
#
# Requires poppler (pdftocairo, pdfseparate, pdfunite). On macOS: `brew install poppler`.
#
# Run from the repo root:  ./scripts/generate-design-portfolio.sh path/to/original.pdf
# If no argument is given, it uses the current public/designPortfolio.pdf as source.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${1:-$ROOT/public/designPortfolio.pdf}"
OUT_DIR="$ROOT/public/design-portfolio"
FIRST_PAGE=2

if ! command -v pdftocairo >/dev/null 2>&1; then
  echo "error: pdftocairo not found. Install poppler (brew install poppler)." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp "$SOURCE" "$TMP/source.pdf"
LAST_PAGE="$(pdfinfo "$TMP/source.pdf" | awk '/^Pages:/ {print $2}')"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/page-*.svg

out_index=1
for page in $(seq "$FIRST_PAGE" "$LAST_PAGE"); do
  pdftocairo -svg -f "$page" -l "$page" "$TMP/source.pdf" "$OUT_DIR/page-$out_index.svg"
  echo "wrote page-$out_index.svg (source page $page)"
  out_index=$((out_index + 1))
done

# Trimmed download PDF (pages 2..end), fonts/content preserved without re-encoding.
pdfseparate -f "$FIRST_PAGE" -l "$LAST_PAGE" "$TMP/source.pdf" "$TMP/page-%d.pdf"
pdfunite "$TMP"/page-*.pdf "$ROOT/public/designPortfolio.pdf"
echo "wrote public/designPortfolio.pdf (pages $FIRST_PAGE-$LAST_PAGE)"
