/**
 * InkFilterDefs.tsx — SVG <defs> block with brush texture filters
 *
 * Mount this ONCE inside the root <svg> of InkOverlay.tsx (or as a sibling
 * zero-size SVG if the overlay SVG structure doesn't allow nested defs).
 *
 * Each filter uses feTurbulence + feDisplacementMap to simulate paper bleed
 * and grain without leaving the SVG rendering pipeline. Apply via:
 *   <path filter="url(#kr-fountain)" ... />
 *
 * The usePencilTools store exports getActiveFilterId(tool, brush) which
 * returns the correct filter ID string for the current tool/brush combo.
 *
 * PERFORMANCE NOTES:
 * - Filters render per-stroke, not per-frame. RAF-based live paths during
 *   active drawing should use NO filter (raw path) and apply the filter
 *   only on pointerup when the stroke finalizes. This avoids the GPU cost
 *   of feTurbulence on every animation frame.
 * - The seed values are fixed so identical strokes render identically
 *   (deterministic — matches our coordinate engine philosophy).
 *
 * iPadOS: Remove this component entirely.
 *         PKCanvasView handles ink rendering natively via Metal.
 *         Brush textures map to PKInkingTool types:
 *           fountain → .pen (with custom PKInk width curve)
 *           technical → .pen (fixed width, high smoothing)
 *           wash → .watercolor (PKInkingTool custom subclass)
 *           marker → .marker
 *           highlighter → .marker (with reduced opacity)
 */

import React from 'react';

interface InkFilterDefsProps {
  /**
   * If true, renders as a zero-size absolute-positioned SVG.
   * Use this when you can't nest <defs> inside InkOverlay's SVG.
   * If false, renders bare <defs> content to nest inside an existing <svg>.
   */
  standalone?: boolean;
}

const FilterDefinitions = () => (
  <defs>
    {/* ── Fountain Pen ─────────────────────────────────────────────────
         Subtle paper bleed + grain. The workhorse for Bible study notes.
         Slight displacement gives organic ink-on-paper feel. */}
    <filter id="kr-fountain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves={3}
        result="noise"
        seed={1}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={1.5}
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />
      <feGaussianBlur in="displaced" stdDeviation={0.25} result="blur" />
      <feComposite in="blur" in2="SourceGraphic" operator="in" />
    </filter>

    {/* ── Technical Pen ────────────────────────────────────────────────
         Crisp, architectural lines. Minimal texture — just enough to
         avoid the "pure digital vector" look. */}
    <filter id="kr-technical" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="1.5"
        numOctaves={1}
        result="noise"
        seed={7}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={0.4}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>

    {/* ── Watercolor Wash ──────────────────────────────────────────────
         Heavy bleed + soft edges + reduced alpha. For devotional art
         and decorative washes over verse backgrounds.
         iPadOS: PKInkingTool.watercolor or custom PKInk subclass */}
    <filter id="kr-wash" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.03"
        numOctaves={4}
        result="noise"
        seed={3}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={6}
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />
      <feGaussianBlur in="displaced" stdDeviation={1.8} result="blur" />
      <feComposite in="blur" in2="SourceGraphic" operator="atop" />
      <feComponentTransfer>
        <feFuncA type="linear" slope={0.55} />
      </feComponentTransfer>
    </filter>

    {/* ── Marker ───────────────────────────────────────────────────────
         Medium bleed, visible edge. Like a Micron or Sharpie. */}
    <filter id="kr-marker" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.15"
        numOctaves={2}
        result="noise"
        seed={5}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={2.5}
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />
      <feGaussianBlur in="displaced" stdDeviation={0.5} />
    </filter>

    {/* ── Highlighter ──────────────────────────────────────────────────
         Wide, semi-transparent, slight bleed. Used for underline-to-
         highlight gesture and manual highlighting.
         Applied when activeTool === 'highlighter' regardless of brushStyle. */}
    <filter id="kr-highlighter" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.12"
        numOctaves={2}
        result="noise"
        seed={9}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={1.8}
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />
      <feGaussianBlur in="displaced" stdDeviation={0.6} />
      <feComponentTransfer>
        <feFuncA type="linear" slope={0.35} />
      </feComponentTransfer>
    </filter>
  </defs>
);

const InkFilterDefs: React.FC<InkFilterDefsProps> = ({ standalone = false }) => {
  if (standalone) {
    return (
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <FilterDefinitions />
      </svg>
    );
  }

  return <FilterDefinitions />;
};

export default InkFilterDefs;
