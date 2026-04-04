import React, { useRef, useEffect, useState } from "react";
import { useSpring, animated, to } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import type { TextAlign, CanvasBackground } from "@/components/bible/ZoomWrapper";

/* ── Constants ── */
const PAPER_W = 1056; // 11in × 96dpi
const PAPER_H = 1632; // 17in × 96dpi
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;
const SPRING_CONFIG = { tension: 170, friction: 26 };
const SNAPBACK_CONFIG = { tension: 120, friction: 20 };
const VELOCITY_BUFFER_SIZE = 5;
const MAX_VELOCITY = 400;
const MAX_ROT_VELOCITY = 90; // deg/s
const MIN_VELOCITY = 50;
const MOMENTUM_FACTOR = 100;
const GRACE_MS = 180;
const DEAD_ZONE_PX = 8;
const BOUNDARY_FRACTION = 0.6;
const OVERSCROLL_RESISTANCE = 0.3;

/* ── Rubber-banding helper ── */
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

/* ── SVG pattern backgrounds ── */
function MarginCanvas({ background }: { background: CanvasBackground }) {
  if (background === "none") return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {background === "dots" && (
            <pattern id="paper-dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.2" className="fill-foreground/15" />
            </pattern>
          )}
          {background === "lines" && (
            <pattern id="paper-ruled-lines" x="0" y="0" width="100%" height="32" patternUnits="userSpaceOnUse">
              <line x1="0" y1="31" x2="100%" y2="31" className="stroke-foreground/10" strokeWidth="0.5" />
            </pattern>
          )}
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={background === "dots" ? "url(#paper-dot-grid)" : "url(#paper-ruled-lines)"}
        />
      </svg>
    </div>
  );
}

export interface PaperCanvasProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  baseFontSize: number;
  textSpacing: number;
  textAlign: TextAlign;
  marginWidth: number;
  canvasBackground: CanvasBackground;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

export function PaperCanvas({
  zoom,
  onZoomChange,
  baseFontSize,
  textSpacing,
  textAlign,
  marginWidth,
  canvasBackground,
  overlay,
  children,
}: PaperCanvasProps) {
  const deskRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      const root = document.documentElement;
      setIsDark(root.classList.contains("dark") || root.classList.contains("bible-dark"));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    config: SPRING_CONFIG,
  }));

  /* ── Gesture-active guard — prevents zoom sync from overriding gestures ── */
  const gestureActive = useRef(false);

  /* ── Sync incoming zoom prop to spring scale (toolbar slider only) ── */
  const zoomRef = useRef(zoom);
  useEffect(() => {
    if (!gestureActive.current && Math.abs(zoom - zoomRef.current) > 0.001) {
      zoomRef.current = zoom;
      api.set({ scale: zoom });
    }
  }, [zoom, api]);

  /* ── Debounced onZoomChange to avoid excessive re-renders ── */
  const zoomChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyZoomChange = (val: number) => {
    zoomRef.current = val;
    if (zoomChangeTimer.current) clearTimeout(zoomChangeTimer.current);
    zoomChangeTimer.current = setTimeout(() => onZoomChange(val), 32);
  };

  /* ── Touch gesture handling ── */
  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;

    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });

    let gestureType: "none" | "zoom" | "pan" = "none";
    let gestureFingerCount = 0;
    let gestureDead = false;
    let lastDist: number | null = null;
    let lastMidpoint: { x: number; y: number } | null = null;
    let lastAngle: number | null = null;
    const velocityBuffer: { x: number; y: number; t: number }[] = [];
    const rotVelocityBuffer: { angle: number; t: number }[] = [];
    let totalMovement = 0;
    let panStartX = 0;
    let panStartY = 0;
    let panStartRotation = 0;

    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let inGracePeriod = false;
    let graceVx = 0;
    let graceVy = 0;
    let graceVr = 0;

    const clampVelocity = (v: number, max = MAX_VELOCITY) =>
      Math.max(-max, Math.min(max, v));

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getMidpoint3 = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX + touches[2].clientX) / 3,
      y: (touches[0].clientY + touches[1].clientY + touches[2].clientY) / 3,
    });

    const getAngle3 = (touches: TouchList) => {
      const dx = touches[2].clientX - touches[0].clientX;
      const dy = touches[2].clientY - touches[0].clientY;
      return Math.atan2(dy, dx) * (180 / Math.PI);
    };

    const clearGrace = () => {
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = null;
      inGracePeriod = false;
      graceVx = 0;
      graceVy = 0;
      graceVr = 0;
    };

    const applyMomentumWithBounds = (vx: number, vy: number, vr: number) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      const rotSpeed = Math.abs(vr);
      if (speed < MIN_VELOCITY && rotSpeed < 5) return;

      const cvx = clampVelocity(vx);
      const cvy = clampVelocity(vy);
      const cvr = clampVelocity(vr, MAX_ROT_VELOCITY);
      const scale = MOMENTUM_FACTOR / 1000;
      const targetX = spring.x.get() + cvx * scale * MOMENTUM_FACTOR;
      const targetY = spring.y.get() + cvy * scale * MOMENTUM_FACTOR;
      const targetR = spring.rotation.get() + cvr * scale * 30;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bx = rubberBand(targetX, vw, false);
      const by = rubberBand(targetY, vh, false);

      api.start({
        x: bx.outOfBounds ? bx.edge : targetX,
        y: by.outOfBounds ? by.edge : targetY,
        rotation: targetR,
        config: bx.outOfBounds || by.outOfBounds ? SNAPBACK_CONFIG : SPRING_CONFIG,
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (inGracePeriod) {
        if (e.touches.length === 3) {
          clearGrace();
        } else {
          return;
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
        lastAngle = getAngle3(e.touches);
        velocityBuffer.length = 0;
        rotVelocityBuffer.length = 0;
        totalMovement = 0;
        panStartX = spring.x.get();
        panStartY = spring.y.get();
        panStartRotation = spring.rotation.get();
        api.stop();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (inGracePeriod) return;
      if (gestureDead) return;

      if (gestureType === "zoom") {
        if (e.touches.length !== gestureFingerCount) {
          gestureDead = true;
          return;
        }
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        if (lastDist !== null) {
          const ratio = dist / lastDist;
          const currentScale = spring.scale.get();
          const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * ratio));
          api.set({ scale: nextScale });
          notifyZoomChange(nextScale);
        }
        lastDist = dist;
      } else if (gestureType === "pan") {
        if (e.touches.length !== gestureFingerCount) {
          gestureDead = true;
          return;
        }
        e.preventDefault();
        const mid = getMidpoint3(e.touches);
        const angle = getAngle3(e.touches);
        if (lastMidpoint && lastAngle !== null) {
          const dx = mid.x - lastMidpoint.x;
          const dy = mid.y - lastMidpoint.y;
          let dAngle = angle - lastAngle;
          if (dAngle > 180) dAngle -= 360;
          if (dAngle < -180) dAngle += 360;
          totalMovement += Math.abs(dx) + Math.abs(dy);

          const rawX = spring.x.get() + dx;
          const rawY = spring.y.get() + dy;
          const rawR = spring.rotation.get() + dAngle;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const bx = rubberBand(rawX, vw, true);
          const by = rubberBand(rawY, vh, true);

          api.set({ x: bx.val, y: by.val, rotation: rawR });

          const now = performance.now();
          velocityBuffer.push({ x: mid.x, y: mid.y, t: now });
          if (velocityBuffer.length > VELOCITY_BUFFER_SIZE) velocityBuffer.shift();
          rotVelocityBuffer.push({ angle, t: now });
          if (rotVelocityBuffer.length > VELOCITY_BUFFER_SIZE) rotVelocityBuffer.shift();
        }
        lastMidpoint = mid;
        lastAngle = angle;
      }
    };

    const onTouchEnd = () => {
      if (inGracePeriod) return;

      if (gestureType === "pan") {
        if (totalMovement < DEAD_ZONE_PX) {
          api.set({ x: panStartX, y: panStartY, rotation: panStartRotation });
          resetGestureState();
          return;
        }

        let vx = 0, vy = 0, vr = 0;
        if (velocityBuffer.length >= 2) {
          const first = velocityBuffer[0];
          const last = velocityBuffer[velocityBuffer.length - 1];
          const dt = (last.t - first.t) / 1000;
          if (dt > 0.01) {
            vx = clampVelocity((last.x - first.x) / dt);
            vy = clampVelocity((last.y - first.y) / dt);
          }
        }
        if (rotVelocityBuffer.length >= 2) {
          const first = rotVelocityBuffer[0];
          const last = rotVelocityBuffer[rotVelocityBuffer.length - 1];
          const dt = (last.t - first.t) / 1000;
          if (dt > 0.01) {
            vr = clampVelocity((last.angle - first.angle) / dt, MAX_ROT_VELOCITY);
          }
        }

        api.stop();
        graceVx = vx;
        graceVy = vy;
        graceVr = vr;
        inGracePeriod = true;

        graceTimer = setTimeout(() => {
          applyMomentumWithBounds(graceVx, graceVy, graceVr);
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
      lastAngle = null;
      velocityBuffer.length = 0;
      rotVelocityBuffer.length = 0;
      totalMovement = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      clearGrace();
      if (zoomChangeTimer.current) clearTimeout(zoomChangeTimer.current);
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onZoomChange, api, spring.x, spring.y, spring.rotation, spring.scale]);

  /* ── Desktop: wheel for pan, ctrl+wheel for zoom ── */
  useGesture(
    {
      onWheel: ({ delta: [, dy], event, ctrlKey, metaKey }) => {
        if (ctrlKey || metaKey) {
          event.preventDefault();
          const currentScale = spring.scale.get();
          const delta = -dy * 0.003;
          const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale + delta));
          api.start({ scale: nextScale });
          notifyZoomChange(nextScale);
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
      target: deskRef,
      wheel: { preventDefault: false },
      eventOptions: { passive: false },
    }
  );

  const fontSize = baseFontSize;
  const lineHeight = baseFontSize * textSpacing;
  const marginPercent = marginWidth;

  return (
    <>
      {/* Desk surface */}
      <div
        ref={deskRef}
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          background: isDark ? "#0f0e0d" : "#e8e4df",
          touchAction: "none",
          zIndex: 1,
        }}
      >
        {/* Paper page */}
        <animated.div
          style={{
            transform: to(
              [spring.x, spring.y, spring.rotation, spring.scale],
              (x, y, r, s) => `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${r}deg) scale(${s})`
            ),
            transformOrigin: "center center",
            position: "absolute",
            top: "50%",
            left: "50%",
            width: PAPER_W,
            height: PAPER_H,
            background: isDark ? "#1a1916" : "#faf8f5",
            boxShadow: isDark
              ? "0 4px 40px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)"
              : "0 4px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
            borderRadius: 2,
            willChange: "transform",
          }}
        >
          {/* Canvas background pattern */}
          <MarginCanvas background={canvasBackground} />

          {/* Text column */}
          <div
            style={{
              maxWidth: "936px",
              margin: "0 auto",
              padding: "80px 60px 100px",
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              textAlign: textAlign,
              paddingLeft: `${60 + (marginPercent / 100) * (PAPER_W - 120)}px`,
              paddingRight: `${60}px`,
              position: "relative",
              zIndex: 2,
              color: isDark ? "#E8E4DF" : "#1A1A1A",
            }}
          >
            {children}
          </div>

          {/* Ink overlay */}
          {overlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              {overlay}
            </div>
          )}
        </animated.div>
      </div>

      {/* Snap to center button */}
      <button
        onClick={() => {
          api.start({ x: 0, y: 0, rotation: 0, scale: 1, config: SNAPBACK_CONFIG });
          notifyZoomChange(1);
        }}
        style={{
          position: "fixed",
          bottom: 140,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 60,
          fontSize: 18,
        }}
        title="Reset view"
      >
        ⌂
      </button>
    </>
  );
}

export default PaperCanvas;
