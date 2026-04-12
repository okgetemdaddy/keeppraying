import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Bookmark, Mic, Type, PenLine, Pencil, Eraser,
  Undo2, AudioLines, Share2, Flag, MessageCircle, Loader2,
  SendHorizontal,
} from "lucide-react";
import { TestimonyEnrichModal } from "./TestimonyEnrichModal";
import { FormattedText } from "@/lib/FormattedText";

/* ═══ Types ═══════════════════════════════════════════════════════════════ */

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Testimony {
  id: string;
  prayer_id: string;
  user_id: string;
  body: string;
  title: string | null;
  verses: any[];
  praise_count: number;
  flagged: boolean;
  created_at: string;
  profiles?: Profile | null;
  user_praised?: boolean;
  user_flagged?: boolean;
  comments?: TestimonyComment[];
  comments_count?: number;
}

interface TestimonyComment {
  id: string;
  testimony_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Profile | null;
}

interface TestifyBackProps {
  prayerId: string;
  prayerAuthorId: string | null | undefined;
  onFlipBack: () => void;
  variant?: "default" | "compact" | "fullscreen";
}

/* ═══ Palette (coffee & cream — canonical from TestimonyCanvasAsset) ══════ */
const bg = "linear-gradient(175deg, #3d3328 0%, #322a20 40%, #2a231a 100%)";
const canvasBg = "#3a3127";
const textPrimary = "#e8dcc8";
const textMuted = "#8a7b68";
const accent = "#c9a84c";
const cardBorder = "rgba(180,140,50,0.1)";

/* ═══ Keyframes ═══════════════════════════════════════════════════════════ */
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

/* ═══ GloryParticles ═════════════════════════════════════════════════════ */
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

/* ═══ HandwriteCanvas ════════════════════════════════════════════════════ */
function HandwriteCanvas() {
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
    ctx.strokeStyle = textPrimary;
    ctx.lineWidth = thickness;
  }, [getCtx, thickness]);

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
    ctx.strokeStyle = textPrimary;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => { isDrawing.current = false; };

  const undo = () => {
    const res = getCtx();
    if (!res) return;
    const last = paths.current.pop();
    if (last) res.ctx.putImageData(last, 0, 0);
  };

  const clear = () => {
    const res = getCtx();
    if (!res) return;
    paths.current = [];
    res.ctx.clearRect(0, 0, res.c.width, res.c.height);
  };

  const thicknessOptions = [1, 2, 3.5, 5];

  return (
    <div className="flex-1 flex flex-col z-10">
      <div className="flex items-center gap-3 mb-2">
        {thicknessOptions.map((t) => (
          <button
            key={t}
            onClick={() => setThickness(t)}
            className="flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              width: 28, height: 28,
              backgroundColor: thickness === t ? "rgba(180,140,50,0.15)" : "transparent",
              border: thickness === t ? "1px solid rgba(180,140,50,0.3)" : "1px solid transparent",
            }}
          >
            <div className="rounded-full" style={{
              width: Math.max(3, t * 2.5),
              height: Math.max(3, t * 2.5),
              backgroundColor: thickness === t ? accent : textMuted,
            }} />
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

/* ═══ Helpers ════════════════════════════════════════════════════════════ */

/** Deterministic gradient from user_id */
const GRADIENTS = [
  "from-violet-600 to-purple-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-sky-600 to-indigo-700",
  "from-rose-600 to-pink-700",
  "from-lime-600 to-green-700",
];

function hashGradient(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function relativeTime(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

/* ═══ Main Component ════════════════════════════════════════════════════ */

export function TestifyBack({ prayerId, prayerAuthorId, onFlipBack, variant = "fullscreen" }: TestifyBackProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  /* Data state */
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loadingTestimonies, setLoadingTestimonies] = useState(true);
  const [body, setBody] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [enrichModalOpen, setEnrichModalOpen] = useState(false);

  /* UI state */
  const [mode, setMode] = useState<"list" | "typing" | "speaking" | "handwriting">("list");

  const MAX_CHARS = 4000;

  /* ── Fetch testimonies ───────────────────────────────────────────────── */
  const fetchTestimonies = async () => {
    setLoadingTestimonies(true);
    try {
      const { data: testimonyData } = await supabase
        .from("testimonies")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("prayer_id", prayerId)
        .order("created_at", { ascending: true });

      if (!testimonyData) { setLoadingTestimonies(false); return; }

      const ids = testimonyData.map(t => t.id);
      const [{ data: praisesData }, { data: flagsData }, { data: commentsCountData }] = await Promise.all([
        ids.length ? supabase.from("testimony_praises").select("testimony_id, user_id").in("testimony_id", ids) : { data: [] },
        user && ids.length ? supabase.from("testimony_flags").select("testimony_id").in("testimony_id", ids).eq("user_id", user.id) : { data: [] },
        ids.length ? supabase.from("testimony_comments").select("testimony_id").in("testimony_id", ids) : { data: [] },
      ]);

      const praiseMap: Record<string, number> = {};
      const userPraisedSet = new Set<string>();
      (praisesData || []).forEach((p: any) => {
        praiseMap[p.testimony_id] = (praiseMap[p.testimony_id] || 0) + 1;
        if (p.user_id === user?.id) userPraisedSet.add(p.testimony_id);
      });

      const userFlaggedSet = new Set((flagsData || []).map((f: any) => f.testimony_id));

      const commentsCountMap: Record<string, number> = {};
      (commentsCountData || []).forEach((c: any) => {
        commentsCountMap[c.testimony_id] = (commentsCountMap[c.testimony_id] || 0) + 1;
      });

      const enriched: Testimony[] = testimonyData.map(t => ({
        ...t,
        title: (t as any).title || null,
        verses: Array.isArray((t as any).verses) ? (t as any).verses : [],
        praise_count: (t as any).praise_count || praiseMap[t.id] || 0,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
        user_praised: userPraisedSet.has(t.id),
        user_flagged: userFlaggedSet.has(t.id),
        comments_count: commentsCountMap[t.id] || 0,
      }));

      enriched.sort((a, b) => {
        const aIsAuthor = a.user_id === prayerAuthorId ? -1 : 0;
        const bIsAuthor = b.user_id === prayerAuthorId ? -1 : 0;
        if (aIsAuthor !== bIsAuthor) return aIsAuthor - bIsAuthor;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTestimonies(enriched);
    } finally {
      setLoadingTestimonies(false);
    }
  };

  useEffect(() => { fetchTestimonies(); }, [prayerId, user?.id]);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const togglePraise = async (testimony: Testimony) => {
    if (!user) { toast({ title: "Sign in to praise 🙏" }); return; }
    if (testimony.user_praised) {
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    }
    setTestimonies(prev => prev.map(t => t.id === testimony.id ? {
      ...t,
      user_praised: !t.user_praised,
      praise_count: (t.praise_count || 0) + (t.user_praised ? -1 : 1),
    } : t));
  };

  const handleShare = (testimony: Testimony) => {
    const url = `${window.location.origin}/testimony/${testimony.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Testimony link copied! 🔗" }));
  };

  const handleFlag = async (testimony: Testimony) => {
    if (!user) { toast({ title: "Sign in to flag content" }); return; }
    if (testimony.user_flagged) return;
    await supabase.from("testimony_flags").insert({ testimony_id: testimony.id, user_id: user.id });
    setTestimonies(prev => prev.map(t => t.id === testimony.id ? { ...t, user_flagged: true } : t));
    toast({ title: "Flagged for review. Thank you." });
  };

  const fetchComments = async (testimonyId: string) => {
    const { data: commentsData } = await supabase
      .from("testimony_comments")
      .select("id, testimony_id, user_id, body, created_at")
      .eq("testimony_id", testimonyId)
      .order("created_at", { ascending: true });
    if (!commentsData) return;
    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profilesData } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : { data: [] };
    const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    const comments: TestimonyComment[] = commentsData.map(c => ({ ...c, profiles: profilesMap[c.user_id] || null }));
    setTestimonies(prev => prev.map(t => t.id === testimonyId ? { ...t, comments } : t));
  };

  const submitComment = async (testimonyId: string) => {
    if (!user) { toast({ title: "Sign in to comment" }); return; }
    const commentBody = commentInputs[testimonyId]?.trim();
    if (!commentBody || commentBody.length < 2) return;
    setSubmittingComment(testimonyId);
    try {
      await supabase.from("testimony_comments").insert({ testimony_id: testimonyId, user_id: user.id, body: commentBody });
      setCommentInputs(prev => ({ ...prev, [testimonyId]: "" }));
      fetchComments(testimonyId);
    } finally {
      setSubmittingComment(null);
    }
  };

  const toggleComments = async (testimonyId: string) => {
    const nowShowing = !showComments[testimonyId];
    setShowComments(prev => ({ ...prev, [testimonyId]: nowShowing }));
    if (nowShowing) fetchComments(testimonyId);
  };

  const alreadyTestified = user && testimonies.some(t => t.user_id === user.id);

  const handleShareClick = () => {
    if (!user) { toast({ title: "Sign in to testify 🙏" }); return; }
    if (body.trim().length < 10) { toast({ title: "Please write a bit more about your testimony." }); return; }
    setEnrichModalOpen(true);
  };

  const expandedTestimony = expandedId ? testimonies.find(t => t.id === expandedId) : null;

  const isBoard = variant === "default" || variant === "compact";

  /* ═══ Render ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden" style={{ background: bg, color: textPrimary }}>
      <style>{TESTIMONY_STYLES}</style>

      {/* ── Glow effects ────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl z-[0]"
        style={{ animation: "testimony-inner-glow 5s ease-in-out infinite" }} />
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none rounded-t-3xl z-[0]"
        style={{
          background: "radial-gradient(ellipse 80% 100% at 50% -15%, rgba(220,190,100,0.10), transparent)",
          animation: "testimony-glory-pulse 6s ease-in-out infinite",
        }} />
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none rounded-b-3xl z-[0]"
        style={{ background: "radial-gradient(ellipse 90% 100% at 50% 120%, rgba(200,170,80,0.06), transparent)" }} />

      <GloryParticles />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between relative z-10 ${isBoard ? "px-3 pt-3 pb-1" : "px-5 pt-5 pb-2"}`}>
        <button onClick={onFlipBack} className="flex items-center gap-1.5 transition-colors active:scale-95" style={{ color: textMuted }}>
          <ArrowLeft className={isBoard ? "w-3.5 h-3.5" : "w-4 h-4"} />
          <span className={`font-medium ${isBoard ? "text-[10px]" : "text-xs"}`}>Back</span>
        </button>
        <h3 className={`font-semibold uppercase tracking-[0.2em] ${isBoard ? "text-[9px]" : "text-[11px]"}`} style={{ color: accent }}>
          Testimony
        </h3>
        <div className={isBoard ? "w-10" : "w-14"} />
      </div>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {expandedTestimony ? (
          /* ── Expanded testimony ──────────────────────────────────── */
          <motion.div
            key={`expanded-${expandedTestimony.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="flex-1 flex flex-col px-4 pb-3 relative z-10 overflow-auto"
          >
            <div className="flex-1 rounded-2xl flex flex-col p-5 relative overflow-hidden"
              style={{
                backgroundColor: canvasBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 4px 24px -4px rgba(180,140,50,0.1)",
              }}>
              {/* Close */}
              <button onClick={() => setExpandedId(null)} className="flex items-center gap-1.5 mb-4 active:scale-95 transition-transform self-start" style={{ color: textMuted }}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">All testimonies</span>
              </button>

              {/* Author header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${hashGradient(expandedTestimony.user_id)} flex items-center justify-center text-xs font-bold text-white`}>
                  {(expandedTestimony.profiles?.full_name || "A")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>
                    {expandedTestimony.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-[10px]" style={{ color: textMuted }}>
                    {relativeTime(expandedTestimony.created_at)}
                  </p>
                </div>
              </div>

              {/* Full testimony text */}
              <div className="flex-1">
                <FormattedText
                  text={expandedTestimony.body}
                  className="text-[16px] leading-[1.9]"
                  style={{ fontFamily: '"Cormorant Garamond", "Georgia", serif', color: textPrimary }}
                />
              </div>

              {/* Bottom actions */}
              <div className="flex items-center justify-between pt-4 mt-auto" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => togglePraise(expandedTestimony)}
                    whileTap={{ scale: 1.3 }}
                    className="flex items-center gap-1.5 active:scale-90 transition-transform"
                  >
                    <span className="text-[15px]">🙌</span>
                    <span className="text-xs font-medium" style={{ color: expandedTestimony.user_praised ? accent : textMuted }}>
                      {expandedTestimony.praise_count || 0}
                    </span>
                  </motion.button>

                  <button onClick={() => handleShare(expandedTestimony)} className="flex items-center gap-1 active:scale-90 transition-transform" style={{ color: textMuted }}>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button onClick={() => toggleComments(expandedTestimony.id)}
                    className="flex items-center gap-1 active:scale-90 transition-transform"
                    style={{ color: showComments[expandedTestimony.id] ? accent : textMuted }}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{expandedTestimony.comments_count || 0}</span>
                  </button>

                  {!expandedTestimony.user_flagged && expandedTestimony.user_id !== user?.id && (
                    <button onClick={() => handleFlag(expandedTestimony)} className="active:scale-90 transition-transform" style={{ color: textMuted }} title="Flag">
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium active:scale-95 transition-all"
                  style={{ backgroundColor: "rgba(180,140,50,0.08)", border: `1px solid ${cardBorder}`, color: textMuted }}>
                  <Bookmark className="w-3.5 h-3.5" />
                  Save to Room
                </button>
              </div>

              {/* Comments section */}
              <AnimatePresence>
                {showComments[expandedTestimony.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-2 pt-3 mt-3"
                    style={{ borderTop: `1px solid ${cardBorder}` }}
                  >
                    {(expandedTestimony.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-2">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${hashGradient(comment.user_id)} flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0`}>
                          {(comment.profiles?.full_name || "A")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-semibold" style={{ color: textPrimary }}>
                            {comment.profiles?.full_name || "Anonymous"}
                          </span>
                          <p className="text-xs leading-snug" style={{ color: textMuted }}>
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div className="flex gap-1.5">
                        <Input
                          value={commentInputs[expandedTestimony.id] || ""}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [expandedTestimony.id]: e.target.value.slice(0, 500) }))}
                          placeholder="Add a comment…"
                          className="h-7 text-xs rounded-xl flex-1 border bg-transparent"
                          style={{ borderColor: cardBorder, color: textPrimary }}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(expandedTestimony.id); } }}
                        />
                        <button
                          onClick={() => submitComment(expandedTestimony.id)}
                          disabled={submittingComment === expandedTestimony.id}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: accent }}
                        >
                          {submittingComment === expandedTestimony.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <SendHorizontal className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        ) : mode === "list" ? (
          /* ── List view ───────────────────────────────────────────── */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden px-4 pb-3 relative z-10"
          >
            {/* Already testified badge */}
            {alreadyTestified && (
              <div className="text-center py-1.5 px-3 rounded-xl text-[11px] font-medium mb-2"
                style={{ background: "rgba(180,140,50,0.1)", color: accent }}>
                ✓ You've shared your testimony for this prayer
              </div>
            )}

            <div className="flex-1 overflow-auto space-y-3">
              {loadingTestimonies ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: textMuted }} />
                </div>
              ) : testimonies.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-2xl">🕊️</p>
                  <p className="text-xs font-medium" style={{ color: textMuted }}>
                    Be the first to testify!
                  </p>
                </div>
              ) : (
                testimonies.map((testimony, i) => {
                  const displayName = testimony.profiles?.full_name || "Anonymous";
                  const initial = displayName[0].toUpperCase();
                  const gradient = hashGradient(testimony.user_id);
                  const isAuthor = testimony.user_id === prayerAuthorId;

                  return (
                    <motion.div
                      key={testimony.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-2xl relative cursor-pointer"
                      onClick={() => setExpandedId(testimony.id)}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        backgroundColor: canvasBg,
                        border: `1px solid ${isAuthor ? "rgba(180,140,50,0.25)" : cardBorder}`,
                        boxShadow: "0 2px 12px -2px rgba(180,140,50,0.06)",
                      }}
                    >
                      {/* 🙌 Praise + Bookmark in upper right */}
                      <div className="absolute top-3 right-3 flex items-center gap-3">
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); togglePraise(testimony); }}
                          whileTap={{ scale: 1.3 }}
                          className="flex items-center gap-1 active:scale-90 transition-transform"
                        >
                          <span className="text-[13px]">🙌</span>
                          <span className="text-[10px]" style={{ color: testimony.user_praised ? accent : textMuted }}>
                            {testimony.praise_count || 0}
                          </span>
                        </motion.button>
                        <button onClick={(e) => e.stopPropagation()} className="active:scale-90 transition-transform" title="Save to Prayer Room">
                          <Bookmark className="w-4 h-4" style={{ color: textMuted }} />
                        </button>
                      </div>

                      {/* Author row */}
                      <div className="flex items-center gap-2 mb-2.5 pr-16">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white`}>
                          {initial}
                        </div>
                        <span className="text-xs font-medium" style={{ color: textPrimary }}>
                          {displayName}
                          {isAuthor && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: accent, color: "#1a1610" }}>
                              Author
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                          {relativeTime(testimony.created_at)}
                        </span>
                      </div>

                      {/* Testimony text */}
                      <p className="text-[14px] leading-relaxed line-clamp-3"
                        style={{ fontFamily: '"Cormorant Garamond", "Georgia", serif', color: textPrimary }}>
                        {testimony.title || testimony.body}
                      </p>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom tagline + Testify button */}
            {!alreadyTestified && (
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
            )}
          </motion.div>

        ) : (
          /* ── Compose mode ────────────────────────────────────────── */
          <motion.div
            key="composing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex flex-col px-4 pb-3 relative z-10"
          >
            <div className="flex-1 rounded-2xl flex flex-col p-4 relative overflow-hidden"
              style={{ backgroundColor: canvasBg, border: `1px solid ${cardBorder}` }}>
              {/* Dot grid */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: "radial-gradient(circle, #c8b898 0.6px, transparent 0.6px)",
                  backgroundSize: "20px 20px",
                }} />

              <p className="text-xs mb-3 z-10" style={{ color: textMuted }}>
                How did God answer this prayer?
              </p>

              {/* Mode selector tabs */}
              <div className="flex items-center gap-1 mb-3 z-10">
                {([
                  { key: "typing" as const, icon: Type, label: "Type" },
                  { key: "speaking" as const, icon: AudioLines, label: "Speak" },
                  { key: "handwriting" as const, icon: Pencil, label: "Write" },
                ]).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                    style={{
                      backgroundColor: mode === key ? "rgba(180,140,50,0.15)" : "transparent",
                      border: mode === key ? "1px solid rgba(180,140,50,0.2)" : "1px solid transparent",
                      color: mode === key ? accent : textMuted,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content area */}
              {mode === "typing" && (
                <textarea
                  autoFocus
                  value={body}
                  onChange={e => setBody(e.target.value.slice(0, MAX_CHARS))}
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

              {mode === "handwriting" && <HandwriteCanvas />}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 z-10" style={{ borderTop: `1px solid ${cardBorder}` }}>
                <button onClick={() => { setMode("list"); }} className="text-xs transition-colors active:scale-95" style={{ color: textMuted }}>
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  {mode === "typing" && (
                    <span className="text-[10px]" style={{ color: textMuted }}>
                      {body.length}/{MAX_CHARS}
                    </span>
                  )}
                  <button
                    onClick={handleShareClick}
                    disabled={mode === "typing" && body.trim().length < 10}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrichment Modal */}
      <TestimonyEnrichModal
        open={enrichModalOpen}
        onOpenChange={setEnrichModalOpen}
        testimonyBody={body.trim()}
        prayerId={prayerId}
        onSuccess={() => {
          setBody("");
          setMode("list");
          fetchTestimonies();
        }}
      />
    </div>
  );
}
