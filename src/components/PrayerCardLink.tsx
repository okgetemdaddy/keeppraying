import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PrayerCardLinkProps {
  id: string;
  title: string;
}

export default function PrayerCardLink({ id, title }: PrayerCardLinkProps) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<{ title: string | null; prayer_text: string; labels: string[] | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160);
    const y = rect.bottom + window.scrollY + 8;
    setPos({ x, y });
  };

  const fetchCard = async () => {
    if (card) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("prayer_cards")
        .select("title, prayer_text, labels")
        .eq("id", id)
        .maybeSingle();
      setCard(data);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    updatePos();
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
      fetchCard();
    }, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 280);
  };

  return (
    <>
      <a
        ref={triggerRef}
        href={`/prayer/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/40 transition-all text-xs font-medium text-primary cursor-pointer"
        onClick={e => e.stopPropagation()}
      >
        <BookOpen className="w-3 h-3 flex-shrink-0" />
        <span>{title}</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>

      <AnimatePresence>
        {open && (
          <motion.div
            key="prayer-preview"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => clearTimeout(timeoutRef.current)}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[9999] w-80 prayer-card p-4 shadow-2xl border border-primary/20"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: "translateX(-50%)",
              maxWidth: "calc(100vw - 2rem)",
            }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
                <Heart className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-primary line-clamp-1">{card?.title || title}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading prayer…</span>
              </div>
            ) : card ? (
              <>
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{card.prayer_text}</p>
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {card.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                <Link
                  to={`/prayer/${id}`}
                  className="mt-2.5 flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  onClick={() => setOpen(false)}
                >
                  Open full prayer <ExternalLink className="w-3 h-3" />
                </Link>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
