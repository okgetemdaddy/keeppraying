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
const MIN_VELOCITY = 50;
const MOMENTUM_FACTOR = 100;
const GRACE_MS = 180;
const BOUNDARY_FRACTION = 0.6;
const OVERSCROLL_RESISTANCE = 0.3;

/* ── Intent locking thresholds (2-finger: pan/zoom only) ── */
const ZOOM_THRESHOLD = 15;    // px finger distance change
const PAN_THRESHOLD = 12;     // px midpoint movement

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

/* ── Touch helpers ── */
const getTouchDist = (touches: TouchList) => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTouchMidpoint = (touches: TouchList) => ({
  x: (touches[0].clientX + touches[1].clientX) / 2,
  y: (touches[0].clientY + touches[1].clientY) / 2,
});

/* 3-finger rotation helper — angle between finger 0 and finger 2 */
const getAngleFromTouches3 = (touches: TouchList) =>
  Math.atan2(
    touches[2].clientY - touches[0].clientY,
    touches[2].clientX - touches[0].clientX
  ) * (180 / Math.PI);

const clampVelocity = (v: number, max = MAX_VELOCITY) =>
  Math.max(-max, Math.min(max, v));

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

  /* ── Committed value refs — shadowed continuously via spring onChange ── */
  const committedScale = useRef(zoom);
  const committedRotation = useRef(0);
  const committedX = useRef(0);
  const committedY = useRef(0);

  /* ── Last gesture zoom — prevents re-render from overwriting spring ── */
  const lastGestureZoom = useRef(zoom);

  /* ── Debug tick for live panel ── */
  const [debugTick, setDebugTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDebugTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotation: 0,
    scale: zoom,
    config: SPRING_CONFIG,
    onChange: {
      x: (val: number) => { committedX.current = val; },
      y: (val: number) => { committedY.current = val; },
      scale: (val: number) => { committedScale.current = val; },
      rotation: (val: number) => { committedRotation.current = val; },
    },
  }));

  /* ── Sync incoming zoom prop from toolbar slider — skip if it matches our last gesture ── */
  useEffect(() => {
    if (Math.abs(zoom - lastGestureZoom.current) > 0.001) {
      api.set({ scale: zoom });
    }
  }, [zoom, api]);

  /* ── Touch gesture system ──
     2 fingers: pan OR zoom (intent locked)
     3 fingers: rotate only
  ── */
  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;

    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", prevent, { passive: false });
    el.addEventListener("gesturechange", prevent, { passive: false });

    let intent: "none" | "pan" | "zoom" = "none";
    let gestureType: "none" | "two-finger" | "rotate" = "none";
    let accumulatedPan = 0;
    let accumulatedZoom = 0;

    let initialDist = 0;
    let initialMidpoint = { x: 0, y: 0 };

    let lastDist = 0;
    let lastMidpoint = { x: 0, y: 0 };
    let lastAngle3 = 0;

    const velocityBuffer: { x: number; y: number; t: number }[] = [];

    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const clearGrace = () => {
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = null;
    };

    const applyPanMomentum = (vx: number, vy: number) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < MIN_VELOCITY) return;

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
      if (e.touches.length === 2) {
        api.stop();

        gestureType = "two-finger";
        initialDist = getTouchDist(e.touches);
        initialMidpoint = getTouchMidpoint(e.touches);

        lastDist = initialDist;
        lastMidpoint = initialMidpoint;

        intent = "none";
        accumulatedPan = 0;
        accumulatedZoom = 0;
        velocityBuffer.length = 0;
        clearGrace();
      } else if (e.touches.length === 3) {
        api.stop();

        gestureType = "rotate";
        lastAngle3 = getAngleFromTouches3(e.touches);
        clearGrace();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      /* ── 2-finger: pan or zoom ── */
      if (e.touches.length === 2 && gestureType === "two-finger") {
        e.preventDefault();

        const dist = getTouchDist(e.touches);
        const midpoint = getTouchMidpoint(e.touches);

        const distDelta = Math.abs(dist - initialDist);
        const panDelta = Math.hypot(
          midpoint.x - initialMidpoint.x,
          midpoint.y - initialMidpoint.y
        );

        accumulatedZoom = distDelta;
        accumulatedPan = panDelta;

        /* Lock intent based on first threshold crossed */
        if (intent === "none") {
          if (accumulatedZoom > ZOOM_THRESHOLD) intent = "zoom";
          else if (accumulatedPan > PAN_THRESHOLD) intent = "pan";
        }

        if (intent === "zoom") {
          const ratio = dist / lastDist;
          if (Math.abs(ratio - 1.0) > 0.008) {
            const currentScale = spring.scale.get();
            const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * ratio));
            api.set({ scale: nextScale });
            lastGestureZoom.current = nextScale;
            onZoomChange(nextScale);
            lastDist = dist;
          }
        }

        if (intent === "pan") {
          const dx = midpoint.x - lastMidpoint.x;
          const dy = midpoint.y - lastMidpoint.y;
          const rawX = spring.x.get() + dx;
          const rawY = spring.y.get() + dy;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const bx = rubberBand(rawX, vw, true);
          const by = rubberBand(rawY, vh, true);
          api.set({ x: bx.val, y: by.val });

          const now = performance.now();
          velocityBuffer.push({ x: midpoint.x, y: midpoint.y, t: now });
          if (velocityBuffer.length > VELOCITY_BUFFER_SIZE) velocityBuffer.shift();
        }

        if (intent !== "zoom") lastDist = dist;
        lastMidpoint = midpoint;
      }

      /* ── 3-finger: rotate only ── */
      if (e.touches.length === 3 && gestureType === "rotate") {
        e.preventDefault();
        const angle = getAngleFromTouches3(e.touches);
        let dAngle = angle - lastAngle3;
        if (dAngle > 180) dAngle -= 360;
        if (dAngle < -180) dAngle += 360;
        api.set({ rotation: spring.rotation.get() + dAngle });
        lastAngle3 = angle;
      }
    };

    const onTouchEnd = () => {
      /* Pan momentum for 2-finger pan */
      if (gestureType === "two-finger" && intent === "pan" && velocityBuffer.length >= 2) {
        const first = velocityBuffer[0];
        const last = velocityBuffer[velocityBuffer.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.01) {
          const vx = clampVelocity((last.x - first.x) / dt);
          const vy = clampVelocity((last.y - first.y) / dt);

          graceTimer = setTimeout(() => {
            applyPanMomentum(vx, vy);
            graceTimer = null;
          }, GRACE_MS);
        }
      }

      /* Sync zoom to React state */
      if (gestureType === "two-finger" && intent === "zoom") {
        const finalScale = spring.scale.get();
        lastGestureZoom.current = finalScale;
        onZoomChange(finalScale);
      }

      /* Reset tracking — NOT spring values */
      gestureType = "none";
      intent = "none";
      accumulatedPan = 0;
      accumulatedZoom = 0;
      velocityBuffer.length = 0;
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
  }, [onZoomChange, api]);

  /* ── Desktop: wheel for pan, ctrl+wheel for zoom ── */
  useGesture(
    {
      onWheel: ({ delta: [, dy], event, ctrlKey, metaKey }) => {
        if (ctrlKey || metaKey) {
          event.preventDefault();
          const currentScale = spring.scale.get();
          const delta = -dy * 0.003;
          const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale + delta));
          api.set({ scale: nextScale });
          lastGestureZoom.current = nextScale;
          onZoomChange(nextScale);
        } else {
          const targetY = spring.y.get() - dy * 2.5;
          const vh = window.innerHeight;
          const by = rubberBand(targetY, vh, false);
          const finalY = by.outOfBounds ? by.edge : targetY;
          api.start({
            y: finalY,
            config: by.outOfBounds ? SNAPBACK_CONFIG : SPRING_CONFIG,
          });
          committedY.current = finalY;
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
          <MarginCanvas background={canvasBackground} />

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

      {/* Debug panel */}
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', color: '#0f0',
        fontFamily: 'monospace', fontSize: 11,
        padding: 10, borderRadius: 8,
        pointerEvents: 'none', minWidth: 220,
      }}>
        <div>tick {debugTick}</div>
        <div>prop zoom: {zoom.toFixed(3)}</div>
        <div>spring scale: {spring.scale.get().toFixed(3)}</div>
        <div>lastGesture: {lastGestureZoom.current.toFixed(3)}</div>
        <div>committed: {committedScale.current.toFixed(3)}</div>
        <div>spring x: {spring.x.get().toFixed(1)}</div>
        <div>spring y: {spring.y.get().toFixed(1)}</div>
        <div>rotation: {spring.rotation.get().toFixed(1)}</div>
      </div>
    </>
  );
}

export default PaperCanvas;
