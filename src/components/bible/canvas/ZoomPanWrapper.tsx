import React, { useRef, useEffect } from "react";
import { useSpring, animated, to } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";

interface ZoomPanWrapperProps {
  drawMode: boolean;
  fontSize: number;
  onFontSizeChange: (fs: number) => void;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}

const MIN_FONT = 14;
const MAX_FONT = 72;
const SPRING_CONFIG = { tension: 170, friction: 26 };
const SNAPBACK_CONFIG = { tension: 120, friction: 20 };
const VELOCITY_BUFFER_SIZE = 5;
const MAX_VELOCITY = 400;
const MIN_VELOCITY = 50;
const MOMENTUM_FACTOR = 100;
const GRACE_MS = 180;
const DEAD_ZONE_PX = 8;
const BOUNDARY_FRACTION = 0.6;
const OVERSCROLL_RESISTANCE = 0.3;

/**
 * Compute rubber-banded position for a given axis.
 * Returns { val, clamped } where val is the position to use
 * and clamped is the nearest edge if out of bounds.
 */
const rubberBand = (
  pos: number,
  viewportSize: number,
  resist: boolean
): { val: number; edge: number; outOfBounds: boolean } => {
  const maxOffset = viewportSize * BOUNDARY_FRACTION;
  const minOffset = -maxOffset;

  if (pos > maxOffset) {
    const overshoot = pos - maxOffset;
    return {
      val: resist ? maxOffset + overshoot * OVERSCROLL_RESISTANCE : maxOffset,
      edge: maxOffset,
      outOfBounds: true,
    };
  }
  if (pos < minOffset) {
    const overshoot = pos - minOffset;
    return {
      val: resist ? minOffset + overshoot * OVERSCROLL_RESISTANCE : minOffset,
      edge: minOffset,
      outOfBounds: true,
    };
  }
  return { val: pos, edge: pos, outOfBounds: false };
};

const ZoomPanWrapper: React.FC<ZoomPanWrapperProps> = ({
  drawMode,
  fontSize,
  onFontSizeChange,
  children,
  overlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: SPRING_CONFIG,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });

    // --- Gesture state ---
    let gestureType: "none" | "zoom" | "pan" = "none";
    let gestureFingerCount = 0;
    let gestureDead = false;
    let lastDist: number | null = null;
    let lastMidpoint: { x: number; y: number } | null = null;
    const velocityBuffer: { x: number; y: number; t: number }[] = [];
    let totalMovement = 0;
    let panStartX = 0;
    let panStartY = 0;

    // --- Grace period state ---
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let inGracePeriod = false;
    let graceVx = 0;
    let graceVy = 0;

    const clampVelocity = (v: number) =>
      Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getMidpoint3 = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX + touches[2].clientX) / 3,
      y: (touches[0].clientY + touches[1].clientY + touches[2].clientY) / 3,
    });

    const clearGrace = () => {
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = null;
      inGracePeriod = false;
      graceVx = 0;
      graceVy = 0;
    };

    const applyMomentumWithBounds = (vx: number, vy: number) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < MIN_VELOCITY) return; // dead stop

      const cvx = clampVelocity(vx);
      const cvy = clampVelocity(vy);
      const scale = MOMENTUM_FACTOR / 1000;
      const targetX = spring.x.get() + cvx * scale * MOMENTUM_FACTOR;
      const targetY = spring.y.get() + cvy * scale * MOMENTUM_FACTOR;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bx = rubberBand(targetX, vw, false);
      const by = rubberBand(targetY, vh, false);

      api.start({
        x: bx.outOfBounds ? bx.edge : targetX,
        y: by.outOfBounds ? by.edge : targetY,
        config: bx.outOfBounds || by.outOfBounds ? SNAPBACK_CONFIG : SPRING_CONFIG,
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      // During grace period, only accept a new 3-finger gesture
      if (inGracePeriod) {
        if (e.touches.length === 3) {
          clearGrace();
          // fall through to start a new pan
        } else {
          return; // discard sloppy lift contacts
        }
      }

      if (e.touches.length === 2) {
        gestureType = "zoom";
        gestureFingerCount = 2;
        gestureDead = false;
        lastDist = getTouchDist(e.touches);
      } else if (e.touches.length === 3) {
        gestureType = "pan";
        gestureFingerCount = 3;
        gestureDead = false;
        lastMidpoint = getMidpoint3(e.touches);
        velocityBuffer.length = 0;
        totalMovement = 0;
        panStartX = spring.x.get();
        panStartY = spring.y.get();
        api.stop();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (inGracePeriod) return; // absorb stray touches
      if (gestureDead) return;

      if (gestureType === "zoom") {
        if (e.touches.length !== gestureFingerCount) {
          gestureDead = true;
          return;
        }
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
      } else if (gestureType === "pan") {
        if (e.touches.length !== gestureFingerCount) {
          gestureDead = true;
          return;
        }
        e.preventDefault();
        const mid = getMidpoint3(e.touches);
        if (lastMidpoint) {
          const dx = mid.x - lastMidpoint.x;
          const dy = mid.y - lastMidpoint.y;
          totalMovement += Math.abs(dx) + Math.abs(dy);

          // Apply with rubber-banding
          const rawX = spring.x.get() + dx;
          const rawY = spring.y.get() + dy;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const bx = rubberBand(rawX, vw, true);
          const by = rubberBand(rawY, vh, true);

          api.set({ x: bx.val, y: by.val });

          velocityBuffer.push({ x: mid.x, y: mid.y, t: performance.now() });
          if (velocityBuffer.length > VELOCITY_BUFFER_SIZE) velocityBuffer.shift();
        }
        lastMidpoint = mid;
      }
    };

    const onTouchEnd = () => {
      if (inGracePeriod) return; // absorb stray lift events

      if (gestureType === "pan") {
        // Dead zone: micro-movement → undo drift
        if (totalMovement < DEAD_ZONE_PX) {
          api.set({ x: panStartX, y: panStartY });
          resetGestureState();
          return;
        }

        // Calculate smoothed velocity from buffer
        let vx = 0;
        let vy = 0;
        if (velocityBuffer.length >= 2) {
          const first = velocityBuffer[0];
          const last = velocityBuffer[velocityBuffer.length - 1];
          const dt = (last.t - first.t) / 1000;
          if (dt > 0.01) {
            vx = clampVelocity((last.x - first.x) / dt);
            vy = clampVelocity((last.y - first.y) / dt);
          }
        }

        // Freeze canvas, enter grace period
        api.stop();
        graceVx = vx;
        graceVy = vy;
        inGracePeriod = true;

        graceTimer = setTimeout(() => {
          applyMomentumWithBounds(graceVx, graceVy);
          inGracePeriod = false;
          graceTimer = null;
        }, GRACE_MS);
      }

      resetGestureState();
    };

    const resetGestureState = () => {
      gestureType = "none";
      gestureFingerCount = 0;
      gestureDead = false;
      lastDist = null;
      lastMidpoint = null;
      velocityBuffer.length = 0;
      totalMovement = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      clearGrace();
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onFontSizeChange, api, spring.x, spring.y]);

  // Desktop — wheel for pan, ctrl+wheel for zoom
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
          const targetY = spring.y.get() - dy * 2.5;
          const vh = window.innerHeight;
          const by = rubberBand(targetY, vh, false);
          api.start({
            y: by.outOfBounds ? by.edge : targetY,
            config: by.outOfBounds ? SNAPBACK_CONFIG : SPRING_CONFIG,
          });
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
          minWidth: "100vw",
          minHeight: "100vh",
          padding: "80px 40px 200px",
          willChange: "transform",
        }}
      >
        {children}
        {overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {overlay}
          </div>
        )}
      </animated.div>
    </div>
  );
};

export default ZoomPanWrapper;
