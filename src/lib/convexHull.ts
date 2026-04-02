/**
 * Convex Hull + Point-in-Polygon for Circle-to-Select gesture.
 *
 * When a user draws a closed loop with Apple Pencil, we:
 * 1. Compute the convex hull of the ink stroke (Graham scan)
 * 2. Check which verse DOM rects fall inside the hull
 * 3. Return the matched verse numbers
 */

/**
 * @native-port — INTERNAL ENGINEERING NOTES (not user-facing)
 * ─────────────────────────────────────────────────────────
 *
 * CIRCLE-TO-LEXICON UPGRADE
 *
 * The current convex hull detects enclosed verse DOM nodes. To enable
 * instant Strong's Concordance lookups, upgrade the intersection logic
 * to target individual word <span> elements tagged with Strong's numbers:
 *
 *   <span data-strongs="G2424">Jesus</span>
 *
 * SPATIAL EXTRACTION PATTERN:
 *
 *   const handleCircleSelection = (polygon: Point2D[]) => {
 *     const wordSpans = document.querySelectorAll('span[data-strongs]');
 *     const selectedStrongs = new Set<string>();
 *
 *     wordSpans.forEach(span => {
 *       const rect = span.getBoundingClientRect();
 *       const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
 *
 *       if (pointInPolygon(center, polygon)) {
 *         selectedStrongs.add(span.getAttribute('data-strongs'));
 *         span.classList.add('lexicon-highlight');
 *       }
 *     });
 *
 *     if (selectedStrongs.size > 0) {
 *       fetchLexiconData(Array.from(selectedStrongs));
 *     }
 *   };
 *
 * The CSS class `lexicon-highlight` triggers a brief glow animation on
 * matched words. The `fetchLexiconData` call queries an edge function
 * backed by a Strong's/Lexicon dataset, returning Greek/Hebrew roots,
 * definitions, and cross-references in a floating popover.
 */

export interface Point2D {
  x: number;
  y: number;
}

/* ── Graham Scan Convex Hull ── */
function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function convexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = sorted.length;

  // Lower hull
  const lower: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  // Upper hull
  const upper: Point2D[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

/* ── Point-in-Polygon (ray casting) ── */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/* ── Rect-in-Polygon: check if center of rect is inside polygon ── */
export function rectInPolygon(
  rect: { x: number; y: number; width: number; height: number },
  polygon: Point2D[],
): boolean {
  const center: Point2D = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  return pointInPolygon(center, polygon);
}

/**
 * Detect if a stroke forms a closed loop.
 * Returns true if start and end points are within `threshold` pixels of each other
 * AND the stroke has enough points to form a meaningful shape.
 */
export function isClosedLoop(
  points: Point2D[],
  threshold = 30,
  minPoints = 20,
): boolean {
  if (points.length < minPoints) return false;
  const first = points[0];
  const last = points[points.length - 1];
  const dist = Math.hypot(last.x - first.x, last.y - first.y);
  return dist <= threshold;
}

/**
 * Given a closed ink stroke and an SVG element containing verse elements,
 * return the verse numbers whose DOM rects are inside the convex hull of the stroke.
 */
export function findVersesInsideStroke(
  strokePoints: Point2D[],
  svgElement: SVGSVGElement,
  zoom: number,
): number[] {
  if (!isClosedLoop(strokePoints)) return [];

  const hull = convexHull(strokePoints);
  if (hull.length < 3) return [];

  const svgRect = svgElement.getBoundingClientRect();
  const matchedVerses: number[] = [];

  document.querySelectorAll("[data-verse]").forEach((el) => {
    const verseNum = parseInt(el.getAttribute("data-verse") ?? "", 10);
    if (isNaN(verseNum)) return;

    const elRect = el.getBoundingClientRect();

    // Convert DOM rect to SVG coordinate space
    const svgSpaceRect = {
      x: (elRect.left - svgRect.left) / zoom,
      y: (elRect.top - svgRect.top) / zoom,
      width: elRect.width / zoom,
      height: elRect.height / zoom,
    };

    if (rectInPolygon(svgSpaceRect, hull)) {
      matchedVerses.push(verseNum);
    }
  });

  return [...new Set(matchedVerses)].sort((a, b) => a - b);
}
