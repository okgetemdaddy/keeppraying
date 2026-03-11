import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cross, Loader2, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const cacheRef = useRef<Record<string, string>>({});
  const triggerRef = useRef<HTMLSpanElement>(null);

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
        body: JSON.stringify({ reference, text }),
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

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 144), window.innerWidth - 144);
    const y = rect.bottom + window.scrollY + 8;
    setPos({ x, y });
  };

  // Desktop: hover
  const handleMouseEnter = () => {
    if (isMobile) return;
    updatePos();
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

  // Mobile: tap to toggle
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMobile) return;
    e.stopPropagation();
    updatePos();
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!summary && !loading) fetchSummary();
  };

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open || !isMobile) return;
    const close = () => setOpen(false);
    setTimeout(() => document.addEventListener("click", close), 50);
    return () => document.removeEventListener("click", close);
  }, [open, isMobile]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const seeMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    const query = `Please give me an in-depth biblical exegesis of ${reference}${text ? `: "${text}"` : ""}. Explain its historical context, Greek/Hebrew meaning, theological significance, and practical application for today.`;
    navigate(`/assistant?q=${encodeURIComponent(query)}`);
  };

  // On mobile show as bottom sheet, desktop as tooltip
  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center gap-1 cursor-pointer group relative select-none ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        onTouchEnd={e => { e.preventDefault(); handleTap(e as unknown as React.MouseEvent); }}
      >
        <Cross className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" strokeWidth={2.5} />
        <span className="verse-text text-sm group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">{reference}</span>
      </span>

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
            className="fixed z-[9999] w-72 prayer-card p-3.5 shadow-2xl border border-border/60"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "translateX(-50%)",
              maxWidth: "calc(100vw - 2rem)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Cross className="w-3 h-3 text-primary flex-shrink-0" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-primary">{reference}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Getting AI summary…</span>
              </div>
            ) : (
              <p className="text-xs text-foreground/80 leading-relaxed">{summary}</p>
            )}
            {!loading && summary && (
              <button onClick={seeMore} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                See more… <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}

        {open && isMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40"
              onClick={() => setOpen(false)}
            />
            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[9999] prayer-card rounded-t-2xl rounded-b-none p-5 pb-8 shadow-2xl border-t border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cross className="w-4 h-4 text-primary" strokeWidth={2.5} />
                  <span className="text-sm font-semibold text-primary">{reference}</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground p-1"><X className="w-4 h-4" /></button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Getting AI summary…</span>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
              )}
              {!loading && summary && (
                <button onClick={seeMore} className="mt-4 flex items-center gap-1.5 text-sm text-primary font-medium">
                  In-depth exegesis <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
