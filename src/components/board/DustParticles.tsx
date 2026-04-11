/**
 * DustParticles — CSS-only floating dust motes for the prayer card.
 *
 * Performance strategy:
 * 1. Pure CSS @keyframes (no framer-motion JS animation runtime)
 * 2. IntersectionObserver — only renders when card is visible
 * 3. Mobile: 10 particles max; desktop: 16
 * 4. GPU-composited via will-change: transform, opacity
 */
import React, { useMemo, useState, useRef, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/* ── Unique keyframe names per instance ─────────────────────────────────── */
let instanceCounter = 0;

interface DustParticlesProps {
  dustColor: string; // e.g. "rgba(210,185,120," — note trailing comma
  disabled?: boolean;
}

export function DustParticles({ dustColor, disabled }: DustParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const instanceId = useMemo(() => ++instanceCounter, []);

  // IntersectionObserver — only animate when in viewport
  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [disabled]);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const count = isMobile ? 10 : 16;

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = 8 + Math.random() * 84;
        const size = 1.5 + Math.random() * 2.5;
        const duration = 5 + Math.random() * 8;
        const delay = Math.random() * 6;
        const opacity = 0.15 + Math.random() * 0.35;
        const yStart = 10 + Math.random() * 60;
        const drift = -15 + Math.random() * 30;
        const name = `dust-${instanceId}-${i}`;
        return { i, left, size, duration, delay, opacity, yStart, drift, name };
      }),
    [count, instanceId]
  );

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-[5]"
    >
      {isVisible && (
        <>
          <style>
            {particles
              .map(
                (p) => `
@keyframes ${p.name} {
  0%   { transform: translate(0, 0);       opacity: 0; }
  15%  { opacity: ${p.opacity}; }
  40%  { transform: translate(${p.drift * 0.5}px, -40px); opacity: ${p.opacity * 0.6}; }
  70%  { transform: translate(${p.drift}px, -55px);       opacity: ${p.opacity}; }
  100% { transform: translate(${p.drift * 0.3}px, -10px); opacity: 0; }
}`
              )
              .join("\n")}
          </style>
          {particles.map((p) => (
            <div
              key={p.i}
              className="absolute rounded-full"
              style={{
                left: `${p.left}%`,
                top: `${p.yStart}%`,
                width: p.size,
                height: p.size,
                background: `radial-gradient(circle, ${dustColor}${p.opacity}), transparent)`,
                animation: `${p.name} ${p.duration}s ${p.delay}s ease-in-out infinite`,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
