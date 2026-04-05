import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, X, BookMarked, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseBibleReferences } from "@/lib/bibleReferenceParser";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VerseLinkProps {
  reference: string;
  text?: string;
  className?: string;
}

export default function VerseLink({ reference, text, className = "" }: VerseLinkProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressRef = useRef<ReturnType<typeof setTimeout>>();
  const cacheRef = useRef<Record<string, string>>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const touchMoved = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchSummary = useCallback(async () => {
    if (cacheRef.current[reference]) { setSummary(cacheRef.current[reference]); return; }
    setLoading(true);
    setSummary(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/verse-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ reference, text, type: "summary" }),
      });
      const data = await resp.json();
      const result = data.summary || "Could not load summary.";
      cacheRef.current[reference] = result;
      setSummary(result);
    } catch {
      setSummary("Unable to load verse summary right now.");
    } finally {
      setLoading(false);
    }
  }, [reference, text]);

  const calcPos = (clientX: number, clientY: number) => {
    const tooltipW = 320;
    const tooltipH = 160;
    const offset = 16;
    const left = clientX + tooltipW + offset > window.innerWidth
      ? clientX - tooltipW - offset / 2
      : clientX + offset;
    const top = clientY + tooltipH + offset > window.innerHeight
      ? clientY - tooltipH - offset / 2
      : clientY + offset;
    return { x: left, y: top };
  };

  /* ── Navigate to verse ── */
  const goToVerse = useCallback(() => {
    setCtxMenu(null);
    setOpen(false);
    const parsed = parseBibleReferences(reference);
    if (parsed.length > 0) {
      const p = parsed[0];
      const params = new URLSearchParams({ book: p.bookUsfm, chapter: String(p.chapter) });
      if (p.verseStart) params.set("verse", String(p.verseStart));
      navigate(`/bible?${params.toString()}`);
    }
  }, [reference, navigate]);

  /* ── Desktop right-click ── */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  /* ── Mobile long-press ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchMoved.current = false;
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      if (!touchMoved.current) {
        setCtxMenu({ x: touch.clientX, y: touch.clientY - 60 });
      }
    }, 500);
  };

  const handleTouchMove = () => {
    touchMoved.current = true;
    clearTimeout(longPressRef.current);
  };

  const handleTouchEndForCtx = () => {
    clearTimeout(longPressRef.current);
  };

  /* ── Close context menu on outside click ── */
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    setTimeout(() => document.addEventListener("click", close), 10);
    return () => document.removeEventListener("click", close);
  }, [ctxMenu]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return;
    setPos(calcPos(e.clientX, e.clientY));
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isMobile) return;
    setPos(calcPos(e.clientX, e.clientY));
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
      if (!summary && !loading) fetchSummary();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 280);
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (touchMoved.current) return;
    if (ctxMenu) return;
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!summary && !loading) fetchSummary();
  };

  useEffect(() => {
    if (!open || !isMobile) return;
    const close = (e: MouseEvent) => {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    setTimeout(() => document.addEventListener("click", close), 50);
    return () => document.removeEventListener("click", close);
  }, [open, isMobile]);

  useEffect(() => () => { clearTimeout(timeoutRef.current); clearTimeout(longPressRef.current); }, []);

  const seeMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    const query = `Please give me an in-depth biblical exegesis of ${reference}${text ? `: "${text}"` : ""}. Explain its historical context, Greek/Hebrew meaning, theological significance, and practical application for today.`;
    navigate(`/assistant?q=${encodeURIComponent(query)}`);
  };

  /* ── Context menu portal ── */
  const contextMenuPortal = ctxMenu ? createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[10000] rounded-xl border border-border bg-popover shadow-xl py-1.5 min-w-[180px]"
      style={{
        left: `${Math.min(ctxMenu.x, window.innerWidth - 200)}px`,
        top: `${Math.min(ctxMenu.y, window.innerHeight - 60)}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={goToVerse}
        className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground"
      >
        <Navigation className="h-3.5 w-3.5 text-primary" />
        <span>Go to {reference}</span>
      </button>
    </motion.div>,
    document.body,
  ) : null;

  const tooltip = (
    <AnimatePresence>
      {open && !isMobile && (
        <motion.div
          key="tooltip"
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[9999] w-80 prayer-card p-4 shadow-2xl border border-primary/20"
          style={{ left: `${pos.x}px`, top: `${pos.y}px`, maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30">
              <BookMarked className="w-3 h-3 text-primary flex-shrink-0" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-primary">{reference}</span>
            </span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Getting summary…</span>
            </div>
          ) : (
            <p className="text-xs text-foreground/80 leading-relaxed">{summary}</p>
          )}
          {!loading && summary && (
            <button onClick={seeMore} className="mt-2.5 flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Deep-dive exegesis <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      )}

      {open && isMobile && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] prayer-card rounded-t-2xl rounded-b-none p-5 pb-8 shadow-2xl border-t border-primary/20"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
                <BookMarked className="w-4 h-4 text-primary" strokeWidth={2.5} />
                <span className="text-sm font-semibold text-primary">{reference}</span>
              </span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Getting summary…</span>
              </div>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
            )}
            {!loading && summary && (
              <div className="flex items-center gap-3 mt-4">
                <button onClick={seeMore} className="flex items-center gap-1.5 text-sm text-primary font-medium">
                  Deep-dive exegesis <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button onClick={goToVerse} className="flex items-center gap-1.5 text-sm text-primary/70 font-medium">
                  <Navigation className="w-3.5 h-3.5" /> Go to verse
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center gap-1 cursor-pointer group relative select-none ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => { handleTouchEndForCtx(); if (!ctxMenu) { e.preventDefault(); handleTap(e as unknown as React.MouseEvent); } }}
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 group-hover:bg-primary/25 group-hover:border-primary/50 transition-all">
          <BookMarked className="w-3 h-3 text-primary flex-shrink-0" strokeWidth={2.5} />
          <span className="verse-text text-xs font-semibold text-primary group-hover:text-primary/90">{reference}</span>
        </span>
      </span>
      {createPortal(tooltip, document.body)}
      {contextMenuPortal}
    </>
  );
}