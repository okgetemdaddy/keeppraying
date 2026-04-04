import React from "react";

export type TextAlign = "left" | "center" | "right";
export type CanvasBackground = "none" | "dots" | "lines";

interface ZoomWrapperProps {
  zoom: number;
  textSpacing: number;
  children: React.ReactNode;
  className?: string;
  textAlign?: TextAlign;
  marginWidth?: number;
  canvasBackground?: CanvasBackground;
  overlay?: React.ReactNode;
  /** When true, sets touch-action: none to prevent browser scroll-interference during drawing */
  studyMode?: boolean;
}

/* ── SVG pattern backgrounds for the writing margin space ── */
function MarginCanvas({ background, className = "" }: { background: CanvasBackground; className?: string }) {
  if (background === "none") {
    return <div className={`pointer-events-none ${className}`} />;
  }

  return (
    <div className={`pointer-events-none ${className}`}>
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {background === "dots" && (
            <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.2" className="fill-foreground/15" />
            </pattern>
          )}
          {background === "lines" && (
            <pattern id="ruled-lines" x="0" y="0" width="100%" height="32" patternUnits="userSpaceOnUse">
              <line x1="0" y1="31" x2="100%" y2="31" className="stroke-foreground/10" strokeWidth="0.5" />
            </pattern>
          )}
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={background === "dots" ? "url(#dot-grid)" : "url(#ruled-lines)"}
        />
      </svg>
    </div>
  );
}

/**
 * Wraps the Bible verse container + InkOverlay with CSS-transform zoom,
 * a --verse-spacing CSS variable for iPad text spacing control,
 * and an optional fluid spatial grid for writing margins.
 */
export function ZoomWrapper({
  zoom,
  textSpacing,
  children,
  className = "",
  textAlign = "left",
  marginWidth = 0,
  canvasBackground = "none",
  overlay,
  studyMode = false,
}: ZoomWrapperProps) {
  const hasMargin = marginWidth > 0;

  /* Build CSS Grid columns based on alignment + margin.
     When study mode is active the container spans the full viewport,
     so the text column is capped at 768px (≈ max-w-3xl) and remaining
     space flows into the margin columns — giving the InkOverlay SVG
     edge-to-edge coverage while keeping scripture readable. */
  const gridTemplateColumns = hasMargin
    ? studyMode
      ? textAlign === "left"
        ? `minmax(0, 768px) 1fr`
        : textAlign === "right"
          ? `1fr minmax(0, 768px)`
          : `1fr minmax(0, 768px) 1fr`
      : textAlign === "left"
        ? `1fr ${marginWidth}%`
        : textAlign === "right"
          ? `${marginWidth}% 1fr`
          : `${marginWidth / 2}% 1fr ${marginWidth / 2}%`
    : undefined;

  return (
    <div
      className={`relative origin-top-left bg-background ${className}`}
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: "top left",
        width: zoom !== 1 ? `${100 / zoom}%` : undefined,
        willChange: zoom !== 1 ? "transform" : undefined,
        touchAction: studyMode ? "none" : "pan-y",
        ["--verse-spacing" as string]: textSpacing,
        ...(hasMargin
          ? {
              display: "grid",
              gridTemplateColumns,
            }
          : {}),
      }}
    >
      {/* Left margin (right-align or center) */}
      {hasMargin && textAlign !== "left" && (
        <MarginCanvas
          background={canvasBackground}
          className="relative min-h-full"
        />
      )}

      {/* Text column — all children (verses + InkOverlay) live here */}
      <div className="relative min-w-0 overflow-visible">
        {children}
      </div>

      {/* Right margin (left-align or center) */}
      {hasMargin && textAlign !== "right" && (
        <MarginCanvas
          background={canvasBackground}
          className="relative min-h-full"
        />
      )}

      {/* Full-span overlay (e.g. InkOverlay) — covers text + margins */}
      {overlay && (
        <div className="absolute inset-0" style={{ gridColumn: "1 / -1", gridRow: "1 / -1", touchAction: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties}>
          {overlay}
        </div>
      )}
    </div>
  );
}
