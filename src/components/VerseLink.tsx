import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cross, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VerseLinkProps {
  reference: string;      // e.g. "Matthew 6:6"
  text?: string;          // optional verse text snippet
  className?: string;
}

export default function VerseLink({ reference, text, className = "" }: VerseLinkProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const cacheRef = useRef<Record<string, string>>({});

  const fetchSummary = useCallback(async () => {
    if (cacheRef.current[reference]) {
      setSummary(cacheRef.current[reference]);
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/verse-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
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

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY + 6 });
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
      if (!summary && !loading) fetchSummary();
    }, 350);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 300);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const seeMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    const query = `Please give me an in-depth biblical exegesis of ${reference}${text ? `: "${text}"` : ""}. Explain its historical context, Greek/Hebrew meaning, theological significance, and practical application for today.`;
    navigate(`/assistant?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <span
        className={`inline-flex items-center gap-1 cursor-pointer group relative ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Cross
          className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary transition-colors flex-shrink-0"
          strokeWidth={2.5}
        />
        <span className="verse-text text-sm group-hover:text-primary transition-colors">{reference}</span>
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => clearTimeout(timeoutRef.current)}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[9999] w-72 prayer-card p-3.5 shadow-xl border border-border/60"
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
              <button
                onClick={seeMore}
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                See more… <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
