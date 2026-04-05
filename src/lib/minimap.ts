/**
 * minimap.ts — Pure SVG minimap generator for KeepRead.ing
 *
 * Converts ink strokes and highlight bounding boxes into a lightweight
 * SVG string suitable for session cards and chapter thumbnails.
 * Typically produces <2KB strings that render at 120Hz in ProMotion scroll.
 *
 * iPadOS: Replace with CAShapeLayer rendering for native thumbnail generation
 */

export interface MinimapStroke {
  pathData: string; // SVG path data e.g. "M 10 10 L 20 20 Q 30 30..."
  color: string; // e.g. "#ff0000"
  strokeWidth?: number; // default 2
}

export interface MinimapHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/**
 * Generates a raw SVG string representing a minimap of study annotations.
 *
 * Visual hierarchy (z-order):
 *   Layer 1: Abstract text lines (light gray rects — decorative paragraph structure)
 *   Layer 2: Highlights (semi-transparent colored rects)
 *   Layer 3: Ink strokes (vector paths with original colors)
 *
 * The viewBox matches the original container dimensions so the browser
 * scales everything down automatically when rendered in a small card.
 *
 * @returns Raw <svg> string, or "" if no annotations exist
 */
export function generateChapterMinimap(
  strokes: MinimapStroke[],
  highlights: MinimapHighlight[],
  containerWidth: number,
  containerHeight: number
): string {
  if (strokes.length === 0 && highlights.length === 0) return "";

  // --- Layer 1: Abstract text lines ---
  const textLineCount = 7;
  const textLineMarginX = containerWidth * 0.1;
  const textLineWidth = containerWidth * 0.8;
  const textLineSpacing = containerHeight / (textLineCount + 2);
  const textLineHeight = 2;

  let textLines = "";
  for (let i = 0; i < textLineCount; i++) {
    const y = textLineSpacing * (i + 1.5);
    textLines += `<rect x="${textLineMarginX}" y="${y}" width="${textLineWidth}" height="${textLineHeight}" fill="#E5E7EB" opacity="0.3" rx="1"/>`;
  }

  // --- Layer 2: Highlights ---
  let highlightRects = "";
  for (const h of highlights) {
    const color = h.color || "#FBBF24";
    highlightRects += `<rect x="${h.x}" y="${h.y}" width="${h.width}" height="${h.height}" fill="${color}" opacity="0.3" rx="1"/>`;
  }

  // --- Layer 3: Ink strokes ---
  let inkPaths = "";
  for (const s of strokes) {
    if (!s.pathData) continue;
    const sw = s.strokeWidth ?? 2;
    const color = s.color || "#ffffff";
    inkPaths += `<path d="${s.pathData}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${containerWidth} ${containerHeight}" preserveAspectRatio="xMidYMid meet"><g>${textLines}</g><g>${highlightRects}</g><g>${inkPaths}</g></svg>`;
}
