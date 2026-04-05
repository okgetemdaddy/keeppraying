import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, CheckCheck, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { USFM_BOOK_NAMES } from "@/lib/usfmBooks";
import VerseLink from "@/components/VerseLink";
import type {
  EnrichmentPayload,
  EnrichmentBunch,
  EnrichmentCard,
  EnrichmentHighlight,
  EnrichmentCrossRef,
} from "@/hooks/useChapterEnrichment";
import type { CrossBunchItem } from "@/hooks/useBibleMutations";

/* ── Props ── */

interface AutoEnrichLayerProps {
  data: EnrichmentPayload | null;
  isLoading: boolean;
  active: boolean;
  verses: { number: number; text: string }[];
  /** Scripture context for CrossBunchItem construction */
  versionId: number;
  bookUsfm: string;
  chapterNumber: number;
  onAdoptHighlight: (verseNumber: number, color: string) => void;
  onAdoptNote: (verseNumber: number, content: string) => void;
  onAdoptBunch: (bunchName: string, items: CrossBunchItem[]) => void;
  onClose: () => void;
  isDark: boolean;
}

/* ── Blend levels ── */
type BlendLevel = "off" | "light" | "full";

function getBlendOpacity(level: BlendLevel): number {
  switch (level) {
    case "off": return 0;
    case "light": return 0.15;
    case "full": return 1;
  }
}

function loadBlendLevel(): BlendLevel {
  try {
    const stored = localStorage.getItem("deep_study_blend");
    if (stored === "off" || stored === "light" || stored === "full") return stored;
  } catch {}
  return "full";
}

/* ── Loading skeleton ── */
function EnrichmentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/30 bg-muted/20 p-4 space-y-2">
          <div className="h-4 w-32 bg-muted/40 rounded" />
          <div className="h-3 w-full bg-muted/30 rounded" />
          <div className="h-3 w-4/5 bg-muted/30 rounded" />
          <div className="h-3 w-3/5 bg-muted/30 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── Exegesis Card ── */
function ExegesisCard({
  card,
  bunch,
  highlights,
  crossRefs,
  onKeep,
  onKeepHighlights,
  kept,
  isDark,
  bookUsfm,
  chapterNumber,
}: {
  card: EnrichmentCard;
  bunch?: EnrichmentBunch;
  highlights: EnrichmentHighlight[];
  crossRefs: EnrichmentCrossRef[];
  onKeep: () => void;
  onKeepHighlights: () => void;
  kept: boolean;
  isDark: boolean;
  bookUsfm: string;
  chapterNumber: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  // On mobile, start collapsed; on desktop, start expanded
  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile]);

  const bookName = USFM_BOOK_NAMES[bookUsfm] || bookUsfm;
  const anchorStart = bunch ? bunch.verseRange[0] : card.anchors[0];
  const anchorEnd = bunch ? bunch.verseRange[1] : card.anchors[1];
  const anchorRef = anchorStart === anchorEnd
    ? `${bookName} ${chapterNumber}:${anchorStart}`
    : `${bookName} ${chapterNumber}:${anchorStart}-${anchorEnd}`;

  const bunchTypeColors: Record<string, string> = {
    thematic: "bg-amber-500/20 text-amber-300",
    narrative: "bg-emerald-500/20 text-emerald-300",
    doctrinal: "bg-violet-500/20 text-violet-300",
    prophetic: "bg-sky-500/20 text-sky-300",
    poetic: "bg-rose-500/20 text-rose-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-2xl border backdrop-blur-xl p-4 space-y-3
        ${isDark
          ? "bg-zinc-900/60 border-white/8"
          : "bg-white/80 border-zinc-200/60"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {bunch && (
              <span className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full ${bunchTypeColors[bunch.type] || bunchTypeColors.thematic}`}>
                {bunch.type}
              </span>
            )}
            <span className="text-[0.65rem] text-muted-foreground font-mono">
              {anchorLabel}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mt-1 leading-snug">
            {card.title}
          </h4>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Highlights for this bunch */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.slice(0, expanded ? undefined : 3).map((hl, i) => (
            <span
              key={i}
              className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full ${
                hl.colorHint === "cyan"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {hl.tokenSpan}
              {hl.tag === "greek_root" && " (Gk)"}
              {hl.tag === "hebrew_root" && " (Hb)"}
            </span>
          ))}
          {!expanded && highlights.length > 3 && (
            <span className="text-[0.6rem] text-muted-foreground">
              +{highlights.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="text-sm leading-relaxed text-foreground/90 font-serif space-y-3 whitespace-pre-line">
              {renderWithVerseLinks(card.body)}
            </div>

            {/* Cross-references */}
            {card.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
                {card.citations.map((cite, i) => (
                  <span
                    key={i}
                    className="text-[0.6rem] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {cite}
                  </span>
                ))}
              </div>
            )}

            {/* Cross-ref connections */}
            {crossRefs.length > 0 && (
              <div className="mt-2 space-y-1">
                {crossRefs.map((ref, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
                    <span className="font-mono">v.{ref.from}</span>
                    <span className="text-primary/60">→</span>
                    <span className="text-primary/80">{ref.to}</span>
                    <span className="italic">({ref.type})</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onKeep}
          disabled={kept}
          className={`text-xs h-7 ${kept ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          {kept ? <CheckCheck className="h-3.5 w-3.5 mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {kept ? "Kept" : "Keep"}
        </Button>
        {highlights.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onKeepHighlights}
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
          >
            Keep Highlights
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Component ── */

export function AutoEnrichLayer({
  data,
  isLoading,
  active,
  verses,
  onAdoptHighlight,
  onAdoptNote,
  versionId,
  bookUsfm,
  chapterNumber,
  onAdoptBunch,
  onClose,
  isDark,
}: AutoEnrichLayerProps) {
  const [blendLevel, setBlendLevel] = useState<BlendLevel>(loadBlendLevel);
  const [keptCards, setKeptCards] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  // Persist blend level
  useEffect(() => {
    try { localStorage.setItem("deep_study_blend", blendLevel); } catch {}
  }, [blendLevel]);

  // Map cards to their bunches
  const cardBunchMap = useMemo(() => {
    if (!data) return new Map<string, EnrichmentBunch>();
    const map = new Map<string, EnrichmentBunch>();
    data.cards.forEach((card) => {
      const bunch = data.bunches.find(
        (b) => b.verseRange[0] === card.anchors[0] && b.verseRange[1] === card.anchors[1]
      );
      if (bunch) map.set(card.id, bunch);
    });
    return map;
  }, [data]);

  // Highlights per card
  const highlightsPerCard = useMemo(() => {
    if (!data) return new Map<string, EnrichmentHighlight[]>();
    const map = new Map<string, EnrichmentHighlight[]>();
    data.cards.forEach((card) => {
      const cardHighlights = data.highlights.filter(
        (h) => h.verseId >= card.anchors[0] && h.verseId <= card.anchors[1]
      );
      map.set(card.id, cardHighlights);
    });
    return map;
  }, [data]);

  // Cross-refs per card
  const crossRefsPerCard = useMemo(() => {
    if (!data) return new Map<string, EnrichmentCrossRef[]>();
    const map = new Map<string, EnrichmentCrossRef[]>();
    data.cards.forEach((card) => {
      const refs = data.crossRefs.filter(
        (r) => r.from >= card.anchors[0] && r.from <= card.anchors[1]
      );
      map.set(card.id, refs);
    });
    return map;
  }, [data]);

  const handleKeepCard = useCallback(
    (card: EnrichmentCard) => {
      // Save as note on first verse
      const content = `[Deep Study] ${card.title}\n\n${card.body}`;
      onAdoptNote(card.anchors[0], content);
      setKeptCards((prev) => new Set(prev).add(card.id));
    },
    [onAdoptNote]
  );

  const handleKeepHighlights = useCallback(
    (card: EnrichmentCard) => {
      const cardHighlights = highlightsPerCard.get(card.id) ?? [];
      cardHighlights.forEach((hl) => {
        const color = hl.colorHint === "cyan" ? "blue" : "yellow";
        onAdoptHighlight(hl.verseId, color);
      });
    },
    [highlightsPerCard, onAdoptHighlight]
  );

  const handleKeepAll = useCallback(() => {
    if (!data) return;
    data.cards.forEach((card) => {
      if (!keptCards.has(card.id)) {
        handleKeepCard(card);
      }
      handleKeepHighlights(card);
    });
    // Adopt bunches
    data.bunches.forEach((bunch) => {
      const items: CrossBunchItem[] = [];
      for (let v = bunch.verseRange[0]; v <= bunch.verseRange[1]; v++) {
        items.push({ verseNumber: v, versionId, bookUsfm, chapterNumber });
      }
      onAdoptBunch(bunch.label, items);
    });
  }, [data, keptCards, handleKeepCard, handleKeepHighlights, onAdoptBunch]);

  const blendOpacity = getBlendOpacity(blendLevel);

  if (!active) return null;

  const blendCycleOrder: BlendLevel[] = ["full", "light", "off"];
  const nextBlend = () => {
    const idx = blendCycleOrder.indexOf(blendLevel);
    setBlendLevel(blendCycleOrder[(idx + 1) % blendCycleOrder.length]);
  };

  return (
    <div
      className="deep-study-layer"
      style={{ opacity: blendOpacity }}
      data-active={active}
    >
      {/* ── Top HUD ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          sticky top-0 z-30 flex items-center gap-2 px-3 py-2 rounded-xl mb-4 backdrop-blur-xl
          ${isDark ? "bg-zinc-900/80 border border-white/8" : "bg-white/90 border border-zinc-200/60"}
        `}
      >
        <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-foreground flex-1">Deep Study</span>

        {/* Blend control */}
        <button
          onClick={nextBlend}
          className="text-[0.6rem] font-medium px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
          title="Cycle blend: Full → Light → Off"
        >
          {blendLevel === "full" ? "Full" : blendLevel === "light" ? "Light" : "Off"}
        </button>


        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* ── Content ── */}
      {isLoading && <EnrichmentSkeleton />}

      {data && (
        <div className="@container">
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
          {/* Structural brackets + cards */}
          {data.cards.map((card, idx) => {
            const bunch = cardBunchMap.get(card.id);
            const cardHighlights = highlightsPerCard.get(card.id) ?? [];
            const cardCrossRefs = crossRefsPerCard.get(card.id) ?? [];
            const isKept = keptCards.has(card.id);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.3 }}
              >
                {/* Bunch bracket label */}
                {bunch && (
                  <div className="flex items-center gap-2 mb-2 pl-1">
                    <div className={`w-0.5 h-4 rounded-full ${isDark ? "bg-amber-400/40" : "bg-amber-500/30"}`} />
                    <span className="text-[0.65rem] font-semibold text-amber-400/80 uppercase tracking-wider">
                      {bunch.label}
                    </span>
                  </div>
                )}

                <ExegesisCard
                  card={card}
                  bunch={bunch}
                  highlights={cardHighlights}
                  crossRefs={cardCrossRefs}
                  onKeep={() => handleKeepCard(card)}
                  onKeepHighlights={() => handleKeepHighlights(card)}
                  kept={isKept}
                  isDark={isDark}
                />
              </motion.div>
            );
          })}
        </div>

          {/* Keep All — bottom of content */}
          <div className="flex justify-center pt-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleKeepAll}
              className="text-xs h-8 text-amber-400 hover:text-amber-300"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Keep All
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !data && active && (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Deep Study analysis will appear here.</p>
        </div>
      )}
    </div>
  );
}
