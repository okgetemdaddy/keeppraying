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
const VELOCITY_BUFFER_SIZE = 4;
const MOMENTUM_FACTOR = 150;

/**
 * ZoomPanWrapper — Strict finger-count gesture routing.
 *
 * 2 fingers → semantic zoom (fontSize)
 * 3 fingers → pan with momentum
 * 1 finger  → reserved for ink / nothing
 * Desktop scroll → vertical pan
 * Desktop ctrl+scroll → semantic zoom
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

  // All touch gesture handling — strict finger-count routing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Suppress Safari proprietary gesture events
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });

    // Tracking state
    let gestureType: "none" | "zoom" | "pan" = "none";
    let lastDist: number | null = null;
    let lastMidpoint: { x: number; y: number } | null = null;
    const velocityBuffer: { x: number; y: number; t: number }[] = [];

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getMidpoint3 = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX + touches[2].clientX) / 3,
      y: (touches[0].clientY + touches[1].clientY + touches[2].clientY) / 3,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        gestureType = "zoom";
        lastDist = getTouchDist(e.touches);
      } else if (e.touches.length === 3) {
        gestureType = "pan";
        lastMidpoint = getMidpoint3(e.touches);
        velocityBuffer.length = 0;
        api.stop();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (gestureType === "zoom" && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        if (lastDist !== null) {
          const delta = dist - lastDist;
          const next = Math.round(
            Math.min(MAX_FONT, Math.max(MIN_FONT, fontSizeRef.current + delta * 0.15))
          );
          if (next !== fontSizeRef.current) onFontSizeChange(next);
        }
        lastDist = dist;
      } else if (gestureType === "pan" && e.touches.length === 3) {
        e.preventDefault();
        const mid = getMidpoint3(e.touches);
        if (lastMidpoint) {
          const dx = mid.x - lastMidpoint.x;
          const dy = mid.y - lastMidpoint.y;
          api.set({ x: spring.x.get() + dx, y: spring.y.get() + dy });

          // Push to velocity buffer
          velocityBuffer.push({ x: mid.x, y: mid.y, t: performance.now() });
          if (velocityBuffer.length > VELOCITY_BUFFER_SIZE) velocityBuffer.shift();
        }
        lastMidpoint = mid;
      }
    };

    const onTouchEnd = () => {
      if (gestureType === "pan" && velocityBuffer.length >= 2) {
        const first = velocityBuffer[0];
        const last = velocityBuffer[velocityBuffer.length - 1];
        const dt = (last.t - first.t) / 1000; // seconds
        if (dt > 0.01) {
          const vx = ((last.x - first.x) / dt) * (MOMENTUM_FACTOR / 1000);
          const vy = ((last.y - first.y) / dt) * (MOMENTUM_FACTOR / 1000);
          api.start({
            x: spring.x.get() + vx * MOMENTUM_FACTOR,
            y: spring.y.get() + vy * MOMENTUM_FACTOR,
            config: SPRING_CONFIG,
          });
        }
      }
      // Reset all tracking
      gestureType = "none";
      lastDist = null;
      lastMidpoint = null;
      velocityBuffer.length = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onFontSizeChange, api, spring.x, spring.y]);

  // Desktop only — wheel for pan, ctrl+wheel for zoom
  useGesture(
    {
      onWheel: ({ delta: [, dy], event, ctrlKey, metaKey }) => {
        if (ctrlKey || metaKey) {
          event.preventDefault();
          const next = Math.round(
            Math.min(MAX_FONT, Math.max(MIN_FONT, fontSizeRef.current - dy * 0.05))
          );
          if (next !== fontSizeRef.current) onFontSizeChange(next);
        } else {
          api.start({ y: spring.y.get() - dy * 2.5 });
        }
      },
    },
    {
      target: containerRef,
      wheel: { preventDefault: false },
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
        touchAction: "none",
        cursor: drawMode ? "crosshair" : "default",
      }}
    >
      <animated.div
        style={{
          transform: to([spring.x, spring.y], (x, y) => `translate3d(${x}px, ${y}px, 0)`),
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
