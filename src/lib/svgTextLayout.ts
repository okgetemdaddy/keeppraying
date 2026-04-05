/**
 * svgTextLayout.ts — Pure text-to-SVG layout engine
 *
 * Converts Bible verses into positioned SVG <text> elements using
 * offscreen canvas measurement for sub-pixel accurate word widths.
 * This produces deterministic, resumable text layouts that survive
 * session resume without re-fetching from the Bible API.
 *
 * @native-port — INTERNAL ENGINEERING NOTES (not user-facing)
 * ─────────────────────────────────────────────────────────
 * iPadOS: Replace canvas measurement with CTFramesetter + CTLine
 * from CoreText for native-quality text layout. The word bounding
 * boxes map 1:1 to CTRun glyph positions.
 */

export interface SvgTextLayoutConfig {
  verses: { number: number; text: string }[];
  containerWidth: number;     // px — text box width
  containerHeight: number;    // px — text box height (for clipping)
  fontSize: number;           // px
  lineHeight: number;         // px (fontSize * lineSpacing)
  fontFamily: string;         // e.g. "'EB Garamond', serif"
  textAlign: "left" | "center" | "right" | "justify";
  isDark: boolean;
}

export interface SvgTextLayoutResult {
  svgString: string;          // Raw <g>...</g> containing all <text> elements
  wordElements: SvgWordElement[];  // For hit-testing (circle-to-select, underline-to-highlight)
  totalHeight: number;        // Actual rendered height of all text
}

export interface SvgWordElement {
  verseNumber: number;
  wordIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Offscreen canvas singleton for text measurement ──
// Reused across calls to avoid GC churn.
let _measureCanvas: HTMLCanvasElement | null = null;
let _measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (!_measureCtx) {
    _measureCanvas = document.createElement("canvas");
    _measureCanvas.width = 1;
    _measureCanvas.height = 1;
    _measureCtx = _measureCanvas.getContext("2d")!;
  }
  return _measureCtx;
}

/**
 * Measure a single word's width using the offscreen canvas.
 * The canvas context font MUST be set before calling this.
 */
function measureWord(ctx: CanvasRenderingContext2D, word: string): number {
  return ctx.measureText(word).width;
}

/**
 * Measure the width of a space character in the current font.
 */
function measureSpace(ctx: CanvasRenderingContext2D): number {
  return ctx.measureText(" ").width;
}

// ── SVG-safe text escaping ──
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * layoutBibleText — Core layout engine
 *
 * MEASUREMENT APPROACH:
 * We create an offscreen <canvas> element and use its 2D context's
 * measureText() API. This gives us sub-pixel accurate width measurements
 * for each word in the exact font that will render in the SVG. The
 * measurements are synchronous and don't touch the DOM layout engine.
 *
 * WORD-WRAPPING ALGORITHM:
 * 1. For each verse, prepend a superscript verse number
 * 2. Iterate through each word, tracking current x position
 * 3. When x + wordWidth > containerWidth, wrap to the next line
 * 4. Emit <text> elements for each line with <tspan> per word
 *
 * The verse number is rendered as a smaller tspan with baseline-shift
 * to create a superscript effect matching the DOM rendering.
 */
export function layoutBibleText(config: SvgTextLayoutConfig): SvgTextLayoutResult {
  const {
    verses,
    containerWidth,
    fontSize,
    lineHeight,
    fontFamily,
    isDark,
  } = config;

  const ctx = getMeasureContext();

  // Set the exact font that will render in the SVG
  const fontString = `${fontSize}px ${fontFamily}`;
  ctx.font = fontString;

  const spaceWidth = measureSpace(ctx);

  // Verse number font — 60% of body size, matching the superscript style
  const verseNumFontSize = Math.round(fontSize * 0.6);
  const verseNumFontString = `${verseNumFontSize}px ${fontFamily}`;

  const textColor = isDark ? "#E8E4DF" : "#1A1A1A";
  const verseNumColor = isDark ? "rgba(232,228,223,0.5)" : "rgba(26,26,26,0.45)";

  // ── Accumulate lines and word elements ──
  const wordElements: SvgWordElement[] = [];
  const lines: Array<{
    y: number;
    spans: Array<{
      text: string;
      x: number;
      isVerseNum: boolean;
      verseNumber: number;
      wordIndex: number;
      width: number;
    }>;
  }> = [];

  let currentY = lineHeight; // First baseline (descenders above 0)
  let currentX = 0;

  for (const verse of verses) {
    if (!verse.text && verse.number === 0) continue;

    // ── Verse number superscript ──
    ctx.font = verseNumFontString;
    const verseNumText = `${verse.number}`;
    const verseNumWidth = measureWord(ctx, verseNumText);

    // Check if we need to start a new line for the verse number
    // (Usually verse numbers start inline with previous verse text)
    if (currentX > 0 && currentX + verseNumWidth + spaceWidth > containerWidth) {
      currentY += lineHeight;
      currentX = 0;
    }

    // If this is the start of a line, start a new line entry
    if (currentX === 0 || !lines.length) {
      lines.push({ y: currentY, spans: [] });
    }

    // Add verse number span
    const currentLine = lines[lines.length - 1];
    currentLine.spans.push({
      text: verseNumText,
      x: currentX,
      isVerseNum: true,
      verseNumber: verse.number,
      wordIndex: -1,
      width: verseNumWidth,
    });
    currentX += verseNumWidth + spaceWidth * 0.5;

    // ── Words in this verse ──
    ctx.font = fontString; // Back to body font
    const words = verse.text.split(/\s+/).filter(Boolean);

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const wordWidth = measureWord(ctx, word);

      // Word wrap check
      if (currentX > 0 && currentX + wordWidth > containerWidth) {
        currentY += lineHeight;
        currentX = 0;
        lines.push({ y: currentY, spans: [] });
      }

      // Ensure we have a line
      if (!lines.length) {
        lines.push({ y: currentY, spans: [] });
      }

      const line = lines[lines.length - 1];

      line.spans.push({
        text: word,
        x: currentX,
        isVerseNum: false,
        verseNumber: verse.number,
        wordIndex: wi,
        width: wordWidth,
      });

      // Register word element for hit-testing
      wordElements.push({
        verseNumber: verse.number,
        wordIndex: wi,
        text: word,
        x: currentX,
        y: currentY - fontSize, // Top of the glyph box
        width: wordWidth,
        height: lineHeight,
      });

      currentX += wordWidth + spaceWidth;
    }
  }

  // ── Generate SVG string ──
  const svgParts: string[] = [];
  svgParts.push(`<g class="bible-text-layout">`);

  for (const line of lines) {
    // Each line is a <text> element at the line's y baseline
    svgParts.push(`  <text y="${line.y.toFixed(1)}" font-family="${escapeXml(fontFamily)}">`);

    for (const span of line.spans) {
      if (span.isVerseNum) {
        // Superscript verse number — smaller font, shifted up
        svgParts.push(
          `    <tspan x="${span.x.toFixed(1)}" font-size="${verseNumFontSize}" fill="${verseNumColor}" baseline-shift="super" data-verse="${span.verseNumber}" data-verse-num="true">${escapeXml(span.text)}</tspan>`
        );
      } else {
        svgParts.push(
          `    <tspan x="${span.x.toFixed(1)}" font-size="${fontSize}" fill="${textColor}" data-verse="${span.verseNumber}" data-word-idx="${span.wordIndex}">${escapeXml(span.text)}</tspan>`
        );
      }
    }

    svgParts.push(`  </text>`);
  }

  svgParts.push(`</g>`);

  const totalHeight = currentY + (lineHeight * 0.5); // Add a bit of padding below last baseline

  return {
    svgString: svgParts.join("\n"),
    wordElements,
    totalHeight,
  };
}
