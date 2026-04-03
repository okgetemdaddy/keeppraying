import React, { useRef, useEffect } from "react";
import { useSpring, animated, to } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";

interface ZoomPanWrapperProps {
  drawMode: boolean;
  fontSize: number;
  onFontSizeChange: (fs: number) => void;
  children: React.ReactNode;
}

const MIN_FONT = 14;
const MAX_FONT = 72;
const SPRING_CONFIG = { tension: 170, friction: 26 };

/**
 * ZoomPanWrapper — The spatial physics engine.
 *
 * Owns all pan (x, y) state via react-spring animated values.
 * Owns semantic zoom by mapping pinch / ctrl+wheel to fontSize.
 *
 * CRITICAL GESTURE GATE:
 * - Two-finger touch drag → pan with momentum
 * - Pinch → semantic zoom (fontSize)
 * - Ctrl/Cmd + wheel → semantic zoom
 * - Plain wheel → vertical pan with spring
 * - Single-finger / mouse drag → ONLY routed to children (InkCanvas) when drawMode=true
 *
 * CRITICAL CSS VARIABLE APPROACH:
 * fontSize is set ONLY via CSS variables on the container.
 * The text column reads --canvas-font-size and --canvas-line-height exclusively.
 * fontSize is NOT passed as a React prop to text — no one-frame desync.
 */
const ZoomPanWrapper: React.FC<ZoomPanWrapperProps> = ({
  drawMode,
  fontSize,
  onFontSizeChange,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: SPRING_CONFIG,
  }));

  // Suppress Safari's proprietary gesture events so @use-gesture receives pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('gesturestart', prevent, { passive: false });
    el.addEventListener('gesturechange', prevent, { passive: false });
    return () => {
      el.removeEventListener('gesturestart', prevent);
      el.removeEventListener('gesturechange', prevent);
    };
  }, []);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], touches, event, cancel }) => {
        // CRITICAL GATE: only pan on two-finger touch drag
        if (touches > 0 && touches < 2) {
          // Single-finger touch → do nothing here, let InkCanvas handle via pointer events
          cancel();
          return;
        }
        // Two-finger touch OR mouse drag (non-draw mode)
        if (touches >= 2 || (!drawMode && touches === 0)) {
          event.preventDefault();
          api.start({ x: spring.x.get() + dx, y: spring.y.get() + dy });
        }
      },
      onPinch: ({ delta: [d], event }) => {
        event.preventDefault();
        const next = Math.round(
          Math.min(MAX_FONT, Math.max(MIN_FONT, fontSizeRef.current + d * 0.5))
        );
        if (next !== fontSizeRef.current) onFontSizeChange(next);
      },
      onWheel: ({ delta: [, dy], event, ctrlKey, metaKey }) => {
        if (ctrlKey || metaKey) {
          // Semantic zoom
          event.preventDefault();
          const next = Math.round(
            Math.min(
              MAX_FONT,
              Math.max(MIN_FONT, fontSizeRef.current - dy * 0.05)
            )
          );
          if (next !== fontSizeRef.current) onFontSizeChange(next);
        } else {
          // Vertical pan with momentum
          api.start({ y: spring.y.get() - dy });
        }
      },
    },
    {
      target: containerRef,
      drag: {
        filterTaps: true,
        // Prevent browser scroll during drag
        preventDefault: true,
        // Use touch: true so we get touch count info
      },
      pinch: {
        scaleBounds: { min: 0.5, max: 3 },
        preventDefault: true,
      },
      wheel: {
        preventDefault: false, // we handle it per-event above
      },
      eventOptions: { passive: false },
    }
  );

  const lineHeight = fontSize * 1.618;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#f5f0e8",
        touchAction: "none", // we manage all touch ourselves
        cursor: drawMode ? "crosshair" : "grab",
      }}
    >
      <animated.div
        style={{
          transform: to([spring.x, spring.y], (x, y) => `translate3d(${x}px, ${y}px, 0)`),
          // CRITICAL: fontSize flows ONLY through CSS variables
          // Text column reads these — no React prop for fontSize
          ["--canvas-font-size" as string]: `${fontSize}px`,
          ["--canvas-line-height" as string]: `${lineHeight}px`,
          position: "relative",
          minHeight: "100vh",
          padding: "80px 40px 200px",
          willChange: "transform",
        }}
      >
        {children}
      </animated.div>
    </div>
  );
};

export default ZoomPanWrapper;
