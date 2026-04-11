import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Type, ArrowLeft, PenLine, Bookmark, Pencil, Eraser, Undo2, AudioLines } from "lucide-react";

/*
  @LOVABLE: TESTIMONY CANVAS — BACKSIDE OF PRAYER CARD
  This component renders the "back" of the prayer card showing testimonies.

  SERVICES NEEDED:
  1. LOAD TESTIMONIES: supabase.from('testimonies').select('*').eq('prayer_id', prayer_id).order('created_at', { ascending: false })
  2. POST TESTIMONY:
     - Type mode: supabase.from('testimonies').insert({ prayer_id, user_id, content, type: 'text' })
     - Speak mode: Record audio via MediaRecorder API → upload to supabase.storage.from('testimony-audio').upload()
       Then: supabase.from('testimonies').insert({ prayer_id, user_id, audio_url, type: 'audio', transcription })
       Consider speech-to-text transcription (Web Speech API or cloud service) to generate text version.
     - Write/Handwrite mode: Capture canvas strokes as serialized path data (JSON array of points + pressure).
       Upload rendered image to supabase.storage, store stroke data for playback animation.
       supabase.from('testimonies').insert({ prayer_id, user_id, image_url, stroke_data, type: 'handwritten' })
  3. PRAISE REACTION: supabase.from('testimony_praises').upsert({ user_id, testimony_id, praised_at })
     - Increments praises count. One praise per user per testimony.
  4. BOOKMARK TESTIMONY: supabase.from('prayer_room_items').insert({ user_id, item_type: 'testimony', item_id: testimony_id })
     - Saves specific testimony to user's prayer room.
  5. PENCIL DETECTION: Listen for pointerType === 'pen' on first interaction.
     - If detected, show alert: "Apple Pencil detected! Write mode activated."
     - Auto-switch to handwriting mode.
     - Full-screen drawing canvas with thickness selector.
     - Stroke recording: store array of { x, y, pressure, timestamp } for animated playback.
     - Owner can toggle playback animation on/off: supabase.from('testimony_settings').upsert({ testimony_id, animate_strokes })
*/

interface TestimonyCanvasAssetProps {
  onFlipBack: () => void;
}

/* Mock testimonies */
const TESTIMONIES = [
  {
    id: 1,
    author: "Sarah M.",
    initial: "S",
    gradient: "from-violet-600 to-purple-700",
    date: "3 days ago",
    text: "God provided a new job opportunity just two weeks after this prayer. His timing is perfect! 🙌",
    praises: 24,
  },
  {
    id: 2,
    author: "John D.",
    initial: "J",
    gradient: "from-emerald-600 to-teal-700",
    date: "1 week ago",
    text: "A stranger blessed my family with groceries. I cried. He hears us.",
    praises: 41,
  },
];

/* ─── Celebratory light particles for testimony ────────────────────────────── */
function GloryParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      size: 1.5 + Math.random() * 3,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.5,
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(220,195,100,${p.opacity}), transparent)`,
          }}
          animate={{
            y: [0, -20, -8, -30, 0],
            opacity: [0, p.opacity, p.opacity * 0.5, p.opacity * 0.8, 0],
            scale: [0.8, 1.2, 0.9, 1.1, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Handwriting canvas with thickness selector ───────────────────────────── */
function HandwriteCanvas({
  color,
  accent,
  textMuted,
  cardBorder,
}: {
  color: string;
  accent: string;
  textMuted: string;
  cardBorder: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const paths = useRef<ImageData[]>([]);
  const [thickness, setThickness] = useState(2);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    return { c, ctx };
  }, []);

  useEffect(() => {
    const res = getCtx();
    if (!res) return;
    const { c, ctx } = res;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
  }, [color, getCtx, thickness]);

  const startDraw = (e: React.PointerEvent) => {
    isDrawing.current = true;
    const res = getCtx();
    if (!res) return;
    const { c, ctx } = res;
    paths.current.push(ctx.getImageData(0, 0, c.width, c.height));
    const rect = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = e.pointerType === "pen" && e.pressure > 0
      ? thickness * (0.5 + e.pressure * 1.5)
      : thickness;
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    const res = getCtx();
    if (!res) return;
    const { c, ctx } = res;
    const rect = c.getBoundingClientRect();
    if (e.pointerType === "pen" && e.pressure > 0) {
      ctx.lineWidth = thickness * (0.5 + e.pressure * 1.5);
    }
    ctx.strokeStyle = color;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => { isDrawing.current = false; };

  const undo = () => {
    const res = getCtx();
    if (!res) return;
    const { ctx } = res;
    const last = paths.current.pop();
    if (last) ctx.putImageData(last, 0, 0);
  };

  const clear = () => {
    const res = getCtx();
    if (!res) return;
    const { c, ctx } = res;
    paths.current = [];
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const thicknessOptions = [1, 2, 3.5, 5];

  return (
    <div className="flex-1 flex flex-col z-10">
      {/* Thickness selector */}
      <div className="flex items-center gap-3 mb-2">
        {thicknessOptions.map((t) => (
          <button
            key={t}
            onClick={() => setThickness(t)}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              width: 28,
              height: 28,
              backgroundColor: thickness === t ? "rgba(180,140,50,0.15)" : "transparent",
              border: thickness === t ? `1px solid rgba(180,140,50,0.3)` : "1px solid transparent",
            }}
            title={`${t}px`}
          >
            <div
              className="rounded-full"
              style={{
                width: Math.max(3, t * 2.5),
                height: Math.max(3, t * 2.5),
                backgroundColor: thickness === t ? accent : textMuted,
              }}
            />
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={undo} className="p-1.5 rounded-lg active:scale-90 transition-transform" style={{ color: accent }} title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={clear} className="p-1.5 rounded-lg active:scale-90 transition-transform" style={{ color: accent }} title="Clear">
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="flex-1 w-full rounded-xl cursor-crosshair touch-none"
        style={{ backgroundColor: "rgba(255,255,255,0.02)", border: `1px solid ${cardBorder}` }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
      <span className="text-[9px] text-center mt-1.5" style={{ color: textMuted }}>
        Apple Pencil &amp; stylus with pressure sensitivity
      </span>
    </div>
  );
}

/* ─── Keyframes ────────────────────────────────────────────────────────────── */
const TESTIMONY_STYLES = `
@keyframes testimony-glory-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 0.9; }
}
@keyframes testimony-inner-glow {
  0%, 100% { box-shadow: inset 0 0 30px 6px rgba(200,170,80,0.03), inset 0 0 60px 12px rgba(180,150,60,0.02); }
  50%      { box-shadow: inset 0 0 40px 10px rgba(200,170,80,0.06), inset 0 0 80px 20px rgba(180,150,60,0.03); }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
export function TestimonyCanvasAsset({ onFlipBack }: TestimonyCanvasAssetProps) {
  const [mode, setMode] = useState<"list" | "typing" | "speaking" | "handwriting">("list");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedTestimony = expandedId !== null ? TESTIMONIES.find((t) => t.id === expandedId) : null;

  /* Coffee & cream palette */
  const bg = "linear-gradient(175deg, #3d3328 0%, #322a20 40%, #2a231a 100%)";
  const canvasBg = "#3a3127";
  const textPrimary = "#e8dcc8";
  const textMuted = "#8a7b68";
  const accent = "#c9a84c";
  const cardBorder = "rgba(180,140,50,0.1)";

  const isComposing = mode !== "list";

  return (
    <div className="flex flex-col h-full w-full relative" style={{ background: bg, color: textPrimary }}>
      <style>{TESTIMONY_STYLES}</style>

      {/* ── Glorious glow effects ─────────────────────────────────────── */}
      {/* Outer-to-inner glow pulse */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl z-[0]"
        style={{
          animation: "testimony-inner-glow 5s ease-in-out infinite",
        }}
      />

      {/* Top glory light */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none rounded-t-3xl z-[0]"
        style={{
          background: "radial-gradient(ellipse 80% 100% at 50% -15%, rgba(220,190,100,0.10), transparent)",
          animation: "testimony-glory-pulse 6s ease-in-out infinite",
        }}
      />

      {/* Bottom glory wash */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none rounded-b-3xl z-[0]"
        style={{
          background: "radial-gradient(ellipse 90% 100% at 50% 120%, rgba(200,170,80,0.06), transparent)",
        }}
      />

      {/* Celebration particles */}
      <GloryParticles />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 relative z-10">
        <button
          onClick={onFlipBack}
          className="flex items-center gap-1.5 transition-colors active:scale-95"
          style={{ color: textMuted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">Back</span>
        </button>

        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Testimony
        </h3>

        <div className="w-14" />
      </div>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {expandedTestimony ? (
          /* ── Expanded testimony ───────────────────────────────────────── */
          <motion.div
            key={`expanded-${expandedTestimony.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="flex-1 flex flex-col px-4 pb-3 relative z-10"
          >
            <div
              className="flex-1 rounded-2xl flex flex-col p-5 relative overflow-hidden"
              style={{
                backgroundColor: canvasBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 4px 24px -4px rgba(180,140,50,0.1)",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setExpandedId(null)}
                className="flex items-center gap-1.5 mb-4 active:scale-95 transition-transform self-start"
                style={{ color: textMuted }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">All testimonies</span>
              </button>

              {/* Author header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${expandedTestimony.gradient} flex items-center justify-center text-xs font-bold text-white`}
                >
                  {expandedTestimony.initial}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>
                    {expandedTestimony.author}
                  </p>
                  <p className="text-[10px]" style={{ color: textMuted }}>
                    {expandedTestimony.date}
                  </p>
                </div>
              </div>

              {/* Full testimony text */}
              <p
                className="flex-1 text-[16px] leading-[1.9]"
                style={{
                  fontFamily: '"Cormorant Garamond", "Georgia", serif',
                  color: textPrimary,
                }}
              >
                {expandedTestimony.text}
              </p>

              {/* Bottom actions */}
              <div className="flex items-center justify-between pt-4 mt-auto" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <button className="flex items-center gap-1.5 active:scale-90 transition-transform" title="Praise God with them">
                  <span className="text-[15px]">🙌</span>
                  <span className="text-xs font-medium" style={{ color: accent }}>
                    {expandedTestimony.praises}
                  </span>
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium active:scale-95 transition-all"
                  style={{
                    backgroundColor: "rgba(180,140,50,0.08)",
                    border: `1px solid ${cardBorder}`,
                    color: textMuted,
                  }}
                  title="Save to Prayer Room"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Save to Room
                </button>
              </div>
            </div>
          </motion.div>
        ) : mode === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden px-4 pb-3 relative z-10"
          >
            {/* Testimony list */}
            <div className="flex-1 overflow-auto space-y-3">
              {TESTIMONIES.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: t.id * 0.15 }}
                  className="p-4 rounded-2xl relative cursor-pointer"
                  onClick={() => setExpandedId(t.id)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    backgroundColor: canvasBg,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: "0 2px 12px -2px rgba(180,140,50,0.06)",
                  }}
                >
                  {/* 🙌 Praise + Bookmark in upper right */}
                  <div className="absolute top-3 right-3 flex items-center gap-3">
                    <button className="flex items-center gap-1 active:scale-90 transition-transform" title="Praise God with them">
                      <span className="text-[13px]">🙌</span>
                      <span className="text-[10px]" style={{ color: accent }}>
                        {t.praises}
                      </span>
                    </button>
                    <button className="active:scale-90 transition-transform" title="Save to Prayer Room">
                      <Bookmark className="w-4 h-4" style={{ color: textMuted }} />
                    </button>
                  </div>

                  {/* Author row */}
                  <div className="flex items-center gap-2 mb-2.5 pr-16">
                    <div
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {t.initial}
                    </div>
                    <span className="text-xs font-medium" style={{ color: textPrimary }}>
                      {t.author}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                      {t.date}
                    </span>
                  </div>

                  {/* Testimony text */}
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{
                      fontFamily: '"Cormorant Garamond", "Georgia", serif',
                      color: textPrimary,
                    }}
                  >
                    {t.text}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Bottom tagline + Testify button */}
            <div className="mt-3 space-y-2.5">
              <span className="text-[10px] font-medium italic tracking-wide px-1" style={{ color: textMuted }}>
                Testify to His Goodness
              </span>

              <button
                onClick={() => setMode("typing")}
                className="w-full py-3.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #d4b04e)`,
                  color: "#1a1610",
                  boxShadow: "0 4px 20px -2px rgba(180,140,50,0.35), 0 0 40px -4px rgba(180,140,50,0.15)",
                }}
              >
                ✝ Testify
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── Compose mode ────────────────────────────────────────────── */
          <motion.div
            key="composing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex flex-col px-4 pb-3 relative z-10"
          >
            <div
              className="flex-1 rounded-2xl flex flex-col p-4 relative overflow-hidden"
              style={{ backgroundColor: canvasBg, border: `1px solid ${cardBorder}` }}
            >
              {/* Dot grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: "radial-gradient(circle, #c8b898 0.6px, transparent 0.6px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <p className="text-xs mb-3 z-10" style={{ color: textMuted }}>
                How did God answer this prayer?
              </p>

              {/* Mode selector tabs */}
              <div className="flex items-center gap-1 mb-3 z-10">
                {([
                  { key: "typing", icon: Type, label: "Type" },
                  { key: "speaking", icon: AudioLines, label: "Speak" },
                  { key: "handwriting", icon: Pencil, label: "Write" },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                    style={{
                      backgroundColor: mode === key ? "rgba(180,140,50,0.15)" : "transparent",
                      border: mode === key ? `1px solid rgba(180,140,50,0.2)` : "1px solid transparent",
                      color: mode === key ? accent : textMuted,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content area based on mode */}
              {mode === "typing" && (
                <textarea
                  autoFocus
                  placeholder="Write your testimony here…"
                  className="flex-1 w-full bg-transparent resize-none text-[15px] leading-relaxed placeholder:opacity-25 focus:outline-none z-10"
                  style={{
                    fontFamily: '"Cormorant Garamond", "Georgia", serif',
                    color: textPrimary,
                    caretColor: accent,
                  }}
                />
              )}

              {mode === "speaking" && (
                <div className="flex-1 flex flex-col items-center justify-center z-10 gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(180,140,50,0.12)", border: `2px solid ${accent}` }}
                  >
                    <Mic className="w-7 h-7" style={{ color: accent }} />
                  </motion.div>
                  <p className="text-xs" style={{ color: textMuted }}>
                    Tap to start recording
                  </p>
                </div>
              )}

              {mode === "handwriting" && (
                <HandwriteCanvas color={textPrimary} accent={accent} textMuted={textMuted} cardBorder={cardBorder} />
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 z-10" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <button
                  onClick={() => setMode("list")}
                  className="text-xs transition-colors active:scale-95"
                  style={{ color: textMuted }}
                >
                  Cancel
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, #d4b04e)`,
                    color: "#1a1610",
                    boxShadow: "0 4px 12px -2px rgba(180,140,50,0.3)",
                  }}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Post
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
