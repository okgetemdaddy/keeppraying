import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Atmosphere definitions ─────────────────────────────────────────────── */
export interface Atmosphere {
  id: string;
  name: string;
  base: string;
  accent: string;
  description: string;
}

export const ATMOSPHERES: Atmosphere[] = [
  { id: "warm-parchment",    name: "Warm Parchment",    base: "#F8F1E3", accent: "#B85C38", description: "Soft drifting parchment texture with faint light rays" },
  { id: "gentle-sage",       name: "Gentle Sage",       base: "#E8F0E8", accent: "#3E6A4E", description: "Delicate floating leaves drifting downward" },
  { id: "heavenly-sky",      name: "Heavenly Sky",      base: "#E0F0FA", accent: "#2A5A9E", description: "Slow-moving clouds with gentle sunbeams" },
  { id: "golden-sunrise",    name: "Golden Sunrise",    base: "#FAF0D8", accent: "#E8B923", description: "Warm pulsing horizon glow with rising light rays" },
  { id: "graceful-lavender", name: "Graceful Lavender", base: "#F0E8FA", accent: "#7B5FD4", description: "Ethereal mist with tiny sparkling particles" },
  { id: "soft-peach",        name: "Soft Peach",        base: "#FAE8E0", accent: "#E07A5F", description: "Gentle breathing ember glow like a comforting fire" },
  { id: "light-olive",       name: "Light Olive",       base: "#F0F5E8", accent: "#6B8E5E", description: "Subtle olive branches and dew drops that sway softly" },
  { id: "pure-sand",         name: "Pure Sand",         base: "#F5F0E8", accent: "#B85C38", description: "Slow rolling sand dunes with meditative wave motion" },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

/* ── Canvas-based atmosphere renderer ─────────────────────────────────── */
interface AtmosphereCanvasProps {
  atmosphereId: string;
  enabled: boolean;
  paused?: boolean;
  className?: string;
}

interface FloatingOrb {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
}

interface DriftLeaf {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  alpha: number;
}

interface Cloud {
  x: number; y: number;
  width: number; height: number;
  speed: number;
  alpha: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface DuneWave {
  phase: number;
  amplitude: number;
  frequency: number;
  yBase: number;
  speed: number;
}

export function AtmosphereCanvas({ atmosphereId, enabled, paused = false, className = "" }: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const atmosphere = useMemo(() => ATMOSPHERES.find(a => a.id === atmosphereId) || ATMOSPHERES[0], [atmosphereId]);
  const [baseR, baseG, baseB] = useMemo(() => hexToRgb(atmosphere.base), [atmosphere]);
  const [accR, accG, accB] = useMemo(() => hexToRgb(atmosphere.accent), [atmosphere]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    let orbs: FloatingOrb[] = [];
    let leaves: DriftLeaf[] = [];
    let clouds: Cloud[] = [];
    let particles: Particle[] = [];
    let duneWaves: DuneWave[] = [];
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio > 1 ? 1.5 : 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio > 1 ? 1.5 : 1);
      w = canvas.width;
      h = canvas.height;
      initData();
    };

    const initData = () => {
      const isMobile = w < 768;
      const scale = isMobile ? 0.5 : 1;

      orbs = Array.from({ length: Math.floor(8 * scale) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 80 + 40,
        alpha: Math.random() * 0.04 + 0.02,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.003 + 0.001,
      }));

      leaves = Array.from({ length: Math.floor(12 * scale) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h - h * 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.25 + 0.08,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        size: Math.random() * 5 + 3,
        alpha: Math.random() * 0.25 + 0.08,
      }));

      clouds = Array.from({ length: Math.floor(5 * scale) }, (_, i) => ({
        x: (w / 5) * i + Math.random() * w * 0.2 - w * 0.1,
        y: Math.random() * h * 0.35,
        width: Math.random() * 200 + 120,
        height: Math.random() * 40 + 20,
        speed: Math.random() * 0.08 + 0.02,
        alpha: Math.random() * 0.06 + 0.03,
      }));

      particles = Array.from({ length: Math.floor(25 * scale) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        life: Math.random() * 300,
        maxLife: Math.random() * 400 + 200,
      }));

      duneWaves = Array.from({ length: 4 }, (_, i) => ({
        phase: Math.random() * Math.PI * 2,
        amplitude: 15 + i * 8,
        frequency: 0.002 + i * 0.001,
        yBase: h * 0.55 + i * h * 0.1,
        speed: 0.002 + Math.random() * 0.002,
      }));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (pausedRef.current) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      const id = atmosphere.id;

      // ── Warm Parchment: drifting texture + light rays ──────────────
      if (id === "warm-parchment") {
        // Soft parchment texture shimmer
        for (const orb of orbs) {
          orb.phase += orb.speed;
          orb.x += orb.vx + Math.sin(orb.phase) * 0.1;
          orb.y += orb.vy + Math.cos(orb.phase * 0.7) * 0.05;
          if (orb.x < -orb.radius) orb.x = w + orb.radius;
          if (orb.x > w + orb.radius) orb.x = -orb.radius;
          if (orb.y < -orb.radius) orb.y = h + orb.radius;
          if (orb.y > h + orb.radius) orb.y = -orb.radius;

          const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
          const pulse = (Math.sin(orb.phase) + 1) * 0.5;
          grad.addColorStop(0, `rgba(${accR},${accG},${accB},${orb.alpha * (0.6 + pulse * 0.4)})`);
          grad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        // Light rays from top-right
        const rayCount = 3;
        for (let i = 0; i < rayCount; i++) {
          const angle = -0.3 + i * 0.15;
          const rayX = w * 0.85;
          const rayAlpha = 0.03 + Math.sin(time * 0.4 + i) * 0.015;
          ctx.save();
          ctx.translate(rayX, 0);
          ctx.rotate(angle);
          const rayGrad = ctx.createLinearGradient(0, 0, 0, h * 1.2);
          rayGrad.addColorStop(0, `rgba(${accR},${accG},${accB},${rayAlpha})`);
          rayGrad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = rayGrad;
          ctx.fillRect(-30 - i * 15, 0, 60 + i * 30, h * 1.2);
          ctx.restore();
        }
      }

      // ── Gentle Sage: floating leaves/petals ───────────────────────
      if (id === "gentle-sage") {
        for (const lf of leaves) {
          lf.x += lf.vx + Math.sin(time * 0.5 + lf.rotation) * 0.08;
          lf.y += lf.vy;
          lf.rotation += lf.rotSpeed;
          if (lf.y > h + 20) { lf.y = -15; lf.x = Math.random() * w; }
          if (lf.x < -20) lf.x = w + 20;
          if (lf.x > w + 20) lf.x = -20;

          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size, lf.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accR},${accG},${accB},${lf.alpha})`;
          ctx.fill();
          // leaf vein
          ctx.beginPath();
          ctx.moveTo(-lf.size * 0.8, 0);
          ctx.lineTo(lf.size * 0.8, 0);
          ctx.strokeStyle = `rgba(${accR},${accG},${accB},${lf.alpha * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.restore();
        }
        // Ground mist
        const mist = ctx.createLinearGradient(0, h * 0.75, 0, h);
        mist.addColorStop(0, `rgba(${accR},${accG},${accB},0)`);
        mist.addColorStop(1, `rgba(${accR},${accG},${accB},0.06)`);
        ctx.fillStyle = mist;
        ctx.fillRect(0, 0, w, h);
      }

      // ── Heavenly Sky: slow clouds + sunbeams ──────────────────────
      if (id === "heavenly-sky") {
        for (const cl of clouds) {
          cl.x += cl.speed;
          if (cl.x > w + cl.width) cl.x = -cl.width;

          ctx.beginPath();
          const cGrad = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.width * 0.5);
          cGrad.addColorStop(0, `rgba(255,255,255,${cl.alpha})`);
          cGrad.addColorStop(0.6, `rgba(255,255,255,${cl.alpha * 0.4})`);
          cGrad.addColorStop(1, `rgba(255,255,255,0)`);
          ctx.fillStyle = cGrad;
          ctx.ellipse(cl.x, cl.y, cl.width * 0.5, cl.height, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Sunbeams
        const beams = 4;
        for (let i = 0; i < beams; i++) {
          const bx = w * (0.3 + i * 0.15);
          const ba = 0.025 + Math.sin(time * 0.3 + i * 1.5) * 0.012;
          ctx.save();
          ctx.translate(bx, 0);
          ctx.rotate(-0.05 + i * 0.04);
          const bGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
          bGrad.addColorStop(0, `rgba(${accR},${accG},${accB},${ba})`);
          bGrad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = bGrad;
          ctx.fillRect(-20, 0, 40, h * 0.7);
          ctx.restore();
        }
      }

      // ── Golden Sunrise: pulsing horizon glow + rising rays ────────
      if (id === "golden-sunrise") {
        const pulse = Math.sin(time * 0.5) * 0.015 + 0.04;
        // Horizon glow
        const horizonGrad = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, w * 0.6);
        horizonGrad.addColorStop(0, `rgba(${accR},${accG},${accB},${pulse})`);
        horizonGrad.addColorStop(0.5, `rgba(${accR},${accG},${accB},${pulse * 0.4})`);
        horizonGrad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, 0, w, h);

        // Rising light rays
        for (let i = 0; i < 5; i++) {
          const rx = w * (0.25 + i * 0.12);
          const ra = 0.02 + Math.sin(time * 0.35 + i * 0.8) * 0.01;
          ctx.save();
          ctx.translate(rx, h * 0.85);
          ctx.rotate(-0.15 + i * 0.07);
          const rGrad = ctx.createLinearGradient(0, 0, 0, -h * 0.6);
          rGrad.addColorStop(0, `rgba(${accR},${accG},${accB},${ra})`);
          rGrad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = rGrad;
          ctx.fillRect(-15, -h * 0.6, 30, h * 0.6);
          ctx.restore();
        }
      }

      // ── Graceful Lavender: ethereal mist + sparkling particles ────
      if (id === "graceful-lavender") {
        // Mist orbs
        for (const orb of orbs) {
          orb.phase += orb.speed;
          orb.x += Math.sin(orb.phase) * 0.12;
          orb.y += Math.cos(orb.phase * 0.6) * 0.08;

          const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 1.3);
          grad.addColorStop(0, `rgba(${accR},${accG},${accB},${orb.alpha * 0.8})`);
          grad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.radius * 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Sparkle particles
        for (const p of particles) {
          p.life++;
          if (p.life > p.maxLife) {
            p.x = Math.random() * w;
            p.y = Math.random() * h;
            p.life = 0;
          }
          p.x += p.vx;
          p.y += p.vy;
          const progress = p.life / p.maxLife;
          const a = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
          const sparkle = Math.sin(p.life * 0.08) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + sparkle * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accR},${accG},${accB},${p.alpha * a * sparkle})`;
          ctx.fill();
        }
      }

      // ── Soft Peach: breathing ember glow ──────────────────────────
      if (id === "soft-peach") {
        const breathe = Math.sin(time * 0.4) * 0.5 + 0.5; // 0-1 oscillation
        // Core ember glow
        const cx = w * 0.5, cy = h * 0.65;
        const innerR = 80 + breathe * 30;
        const outerR = 250 + breathe * 60;
        const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, `rgba(${accR},${accG},${accB},${0.06 + breathe * 0.03})`);
        grad.addColorStop(0.5, `rgba(${accR},${accG},${accB},${0.025 + breathe * 0.015})`);
        grad.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Secondary glows
        const positions = [[w * 0.2, h * 0.4], [w * 0.8, h * 0.5]];
        for (const [gx, gy] of positions) {
          const a = 0.025 + Math.sin(time * 0.3 + gx) * 0.01;
          const g2 = ctx.createRadialGradient(gx, gy, 0, gx, gy, 120);
          g2.addColorStop(0, `rgba(${accR},${accG},${accB},${a})`);
          g2.addColorStop(1, `rgba(${accR},${accG},${accB},0)`);
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(gx, gy, 120, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Light Olive: olive branches + dew drops ───────────────────
      if (id === "light-olive") {
        for (const lf of leaves) {
          lf.x += lf.vx * 0.3 + Math.sin(time * 0.3 + lf.rotation) * 0.06;
          lf.y += lf.vy * 0.15 + Math.sin(time * 0.2) * 0.03;
          lf.rotation += lf.rotSpeed * 0.5;
          if (lf.y > h + 20) { lf.y = -15; lf.x = Math.random() * w; }

          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rotation);
          // Olive leaf shape
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size * 1.2, lf.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accR},${accG},${accB},${lf.alpha * 0.7})`;
          ctx.fill();
          ctx.restore();
        }
        // Dew drops (sparkles near bottom)
        for (let i = 0; i < 6; i++) {
          const dx = (w / 7) * (i + 1);
          const dy = h * 0.7 + Math.sin(time * 0.5 + i) * 8;
          const da = 0.15 + Math.sin(time * 0.8 + i * 2) * 0.1;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${da})`;
          ctx.fill();
        }
      }

      // ── Pure Sand: rolling dunes with wave motion ─────────────────
      if (id === "pure-sand") {
        for (const dune of duneWaves) {
          dune.phase += dune.speed;
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 4) {
            const y = dune.yBase + Math.sin(x * dune.frequency + dune.phase) * dune.amplitude;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = `rgba(${accR},${accG},${accB},0.03)`;
          ctx.fill();
        }
        // Subtle sand shimmer
        for (const p of particles.slice(0, 10)) {
          p.life++;
          if (p.life > p.maxLife) {
            p.x = Math.random() * w;
            p.y = h * 0.5 + Math.random() * h * 0.4;
            p.life = 0;
          }
          const a = Math.sin((p.life / p.maxLife) * Math.PI) * p.alpha * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accR},${accG},${accB},${a})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [atmosphere, enabled, baseR, baseG, baseB, accR, accG, accB]);

  return (
    <AnimatePresence>
      {enabled && (
        <motion.canvas
          ref={canvasRef}
          key={atmosphereId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
          style={{ zIndex: 0 }}
        />
      )}
    </AnimatePresence>
  );
}

/* ── Atmosphere Thumbnail (for selector) ──────────────────────────────── */
export function AtmosphereThumbnail({
  atmosphere,
  selected,
  onClick,
}: {
  atmosphere: Atmosphere;
  selected: boolean;
  onClick: () => void;
}) {
  const [accR, accG, accB] = hexToRgb(atmosphere.accent);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden text-left transition-all duration-300 group"
      style={{
        background: atmosphere.base,
        boxShadow: selected
          ? `0 0 0 2px ${atmosphere.accent}, 0 0 0 6px ${atmosphere.accent}30`
          : "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Mini animated preview */}
      <div className="relative h-16 overflow-hidden">
        {/* Static preview approximation using CSS */}
        <div className="absolute inset-0" style={{ background: atmosphere.base }} />

        {/* Animated accent orbs */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            x: [0, 10, -5, 0],
            y: [0, -5, 3, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 50,
            height: 50,
            top: "20%",
            left: "20%",
            background: `radial-gradient(circle, rgba(${accR},${accG},${accB},0.2), transparent)`,
          }}
        />
        <motion.div
          className="absolute rounded-full"
          animate={{
            x: [0, -8, 4, 0],
            y: [0, 4, -6, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{
            width: 40,
            height: 40,
            top: "40%",
            right: "15%",
            background: `radial-gradient(circle, rgba(${accR},${accG},${accB},0.15), transparent)`,
          }}
        />

        {/* Selected checkmark */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: atmosphere.accent }}
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </div>

      {/* Label */}
      <div className="px-2.5 py-2">
        <p className="text-[10px] font-semibold leading-tight" style={{ color: atmosphere.accent }}>
          {atmosphere.name}
        </p>
        <p className="text-[8px] mt-0.5 leading-tight opacity-50" style={{ color: atmosphere.accent }}>
          {atmosphere.description.split(" ").slice(0, 4).join(" ")}…
        </p>
      </div>
    </motion.button>
  );
}
