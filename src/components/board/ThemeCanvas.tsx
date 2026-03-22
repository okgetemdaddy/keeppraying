import { useEffect, useRef } from "react";
import type { BoardTheme } from "./boardThemes";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface Star {
  x: number; y: number;
  size: number;
  twinkle: number;
  twinkleSpeed: number;
  alpha: number;
}

interface Leaf {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  alpha: number;
}

interface Raindrop {
  x: number; y: number;
  speed: number;
  length: number;
  alpha: number;
}

function initParticles(w: number, h: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -Math.random() * 0.3 - 0.1,
    radius: Math.random() * 3 + 1,
    alpha: Math.random() * 0.5 + 0.1,
    life: Math.random() * 200,
    maxLife: Math.random() * 300 + 200,
    hue: Math.random() * 20 + 35,
  }));
}

function initStars(w: number, h: number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 1.8 + 0.3,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
    alpha: Math.random() * 0.6 + 0.3,
  }));
}

function initLeaves(w: number, h: number, count: number): Leaf[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h - h,
    vx: (Math.random() - 0.5) * 0.8,
    vy: Math.random() * 0.6 + 0.2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    size: Math.random() * 6 + 4,
    alpha: Math.random() * 0.5 + 0.2,
  }));
}

function initRain(w: number, h: number, count: number): Raindrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: Math.random() * 4 + 3,
    length: Math.random() * 14 + 8,
    alpha: Math.random() * 0.25 + 0.05,
  }));
}

export function ThemeCanvas({
  theme,
  enabled,
  className = "",
}: {
  theme: BoardTheme;
  enabled: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dataRef = useRef<{
    particles: Particle[];
    stars: Star[];
    leaves: Leaf[];
    rain: Raindrop[];
    shootingTimer: number;
    candleFlicker: number;
    ripplePhase: number;
  }>({
    particles: [], stars: [], leaves: [], rain: [],
    shootingTimer: 0, candleFlicker: 0, ripplePhase: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width, h = canvas.height;
      const isMobile = w < 768;
      const d = dataRef.current;
      const scale = isMobile ? 0.4 : 1;
      d.particles = initParticles(w, h, Math.floor(40 * scale));
      d.stars = initStars(w, h, Math.floor(120 * scale));
      d.leaves = initLeaves(w, h, Math.floor(18 * scale));
      d.rain = initRain(w, h, Math.floor(80 * scale));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (!enabled) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const d = dataRef.current;
      const type = theme.animationType;

      if (type === "particles") {
        for (const p of d.particles) {
          p.life++;
          if (p.life > p.maxLife) {
            p.x = Math.random() * w; p.y = h + 10;
            p.life = 0; p.maxLife = Math.random() * 300 + 200;
          }
          p.x += p.vx; p.y += p.vy;
          const progress = p.life / p.maxLife;
          const a = progress < 0.2 ? progress * 5 * p.alpha : progress > 0.8 ? (1 - progress) * 5 * p.alpha : p.alpha;
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
          grad.addColorStop(0, `hsla(${p.hue},85%,70%,${a})`);
          grad.addColorStop(1, `hsla(${p.hue},80%,60%,0)`);
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (type === "stars") {
        for (const s of d.stars) {
          s.twinkle += s.twinkleSpeed;
          const a = s.alpha * (0.6 + Math.sin(s.twinkle) * 0.4);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,220,255,${a})`;
          ctx.fill();
        }
        // Shooting star
        d.shootingTimer++;
        if (d.shootingTimer > 280 && Math.random() < 0.01) {
          const sx = Math.random() * w * 0.7;
          const sy = Math.random() * h * 0.3;
          const grad = ctx.createLinearGradient(sx, sy, sx + 120, sy + 50);
          grad.addColorStop(0, "rgba(200,220,255,0)");
          grad.addColorStop(0.5, "rgba(200,220,255,0.7)");
          grad.addColorStop(1, "rgba(200,220,255,0)");
          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.moveTo(sx, sy); ctx.lineTo(sx + 120, sy + 50);
          ctx.stroke();
          d.shootingTimer = 0;
        }
      }

      if (type === "leaves") {
        for (const lf of d.leaves) {
          lf.x += lf.vx; lf.y += lf.vy;
          lf.rotation += lf.rotSpeed;
          if (lf.y > h + 20) { lf.y = -20; lf.x = Math.random() * w; }
          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size, lf.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,160,80,${lf.alpha})`;
          ctx.fill();
          ctx.restore();
        }
        // Mist
        const mist = ctx.createLinearGradient(0, h * 0.7, 0, h);
        mist.addColorStop(0, "rgba(80,130,80,0)");
        mist.addColorStop(1, "rgba(60,110,60,0.12)");
        ctx.fillStyle = mist;
        ctx.fillRect(0, 0, w, h);
      }

      if (type === "rain") {
        for (const r of d.rain) {
          r.y += r.speed;
          if (r.y > h) { r.y = -r.length; r.x = Math.random() * w; }
          ctx.beginPath();
          ctx.strokeStyle = `rgba(160,180,210,${r.alpha})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - 1, r.y + r.length);
          ctx.stroke();
        }
        // Fog
        const fog = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        fog.addColorStop(0, "rgba(140,160,200,0.10)");
        fog.addColorStop(1, "rgba(140,160,200,0)");
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);
      }

      if (type === "ripples") {
        d.ripplePhase += 0.012;
        const cx = w * 0.5, cy = h * 0.72;
        for (let i = 0; i < 5; i++) {
          const phase = d.ripplePhase + i * 1.2;
          const radius = 60 + i * 80 + Math.sin(phase) * 15;
          const a = 0.04 + Math.sin(phase) * 0.02;
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius * 2.5, radius * 0.4, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100,180,220,${a})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        // Horizon glow
        const glow = ctx.createLinearGradient(0, 0, 0, h * 0.45);
        glow.addColorStop(0, "rgba(255,200,120,0.08)");
        glow.addColorStop(1, "rgba(100,180,220,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      if (type === "candle") {
        d.candleFlicker += 0.04;
        const flicker = Math.sin(d.candleFlicker * 2.3) * 0.015 + Math.sin(d.candleFlicker * 5.7) * 0.008;
        // Multi-candle glows
        const positions = [0.2, 0.5, 0.8];
        for (const px of positions) {
          const cx = w * px, cy = h * 0.75;
          const r = 90 + flicker * 120;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, `rgba(255,160,40,${0.08 + flicker * 0.5})`);
          grad.addColorStop(0.4, `rgba(255,100,20,0.04)`);
          grad.addColorStop(1, "rgba(255,80,10,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [theme, enabled]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: enabled ? 1 : 0, transition: "opacity 0.6s ease" }}
    />
  );
}
