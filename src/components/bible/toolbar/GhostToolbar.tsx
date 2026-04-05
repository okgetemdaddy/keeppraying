/**
 * GhostToolbar.tsx — "The Ghost Bar" for Margin Mode
 *
 * REPLACES: Margin-mode tool UI that was partially in iPadStudyToolbar.tsx
 * MOUNTS WHEN: pointerType === 'pen' detected in default /bible reading view
 *              AND isInPaperCanvas === false
 *
 * Design philosophy: Aggressively minimal. Passive hardware state indicator.
 * - Auto-collapses to a color dot when user scrolls via finger/touch
 * - Re-expands when Apple Pencil hovers or taps
 * - Floating pill, bottom-center, z-50
 * - Tools: Pen, Highlighter, Eraser + Margin Rules flyout
 *
 * INTEGRATION:
 *   // In BibleReader.tsx, inside the default /bible view branch:
 *   {pencilDetected && !isInPaperCanvas && (
 *     <GhostToolbar />
 *   )}
 *
 * iPadOS: Replace with UIToolbar using .compactInline appearance,
 *         anchored to inputAccessoryView of the PKCanvasView.
 *         Margin rules → PKRuledBackground configuration.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, Highlighter, Eraser, Grid3X3, AlignJustify, X } from 'lucide-react';
import { usePencilTools, type ToolType, type MarginRule } from '@/hooks/usePencilTools';

// ─── Tool Definitions ────────────────────────────────────────────────────────

interface GhostTool {
  id: ToolType;
  icon: React.ElementType;
  label: string;
}

const GHOST_TOOLS: GhostTool[] = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

interface RuleDef {
  id: MarginRule;
  icon: React.ElementType;
  label: string;
}

const MARGIN_RULES: RuleDef[] = [
  { id: 'none', icon: X, label: 'None' },
  { id: 'dots', icon: Grid3X3, label: 'Dots' },
  { id: 'lines', icon: AlignJustify, label: 'Lines' },
];

// ─── Ghost Toolbar Component ─────────────────────────────────────────────────

const GhostToolbar: React.FC = () => {
  const {
    activeTool,
    setTool,
    color,
    marginRule,
    setMarginRule,
  } = usePencilTools();

  const [expanded, setExpanded] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-collapse on scroll, expand on pen ──────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setExpanded(false);
      setShowRules(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setExpanded(true), 1200);
    };

    const handlePointer = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        setExpanded(true);
      }
    };

    // Listen on the scrollable Bible text container
    // In production, scope this to the actual scroll container ref
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointer);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointer);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed bottom-6 left-1/2 z-50 flex items-center gap-1 px-2 py-1.5
          bg-zinc-900/70 backdrop-blur-2xl rounded-full
          border border-white/[0.06]
          shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]"
        initial={{ y: 40, opacity: 0 }}
        animate={{
          y: expanded ? 0 : 24,
          opacity: expanded ? 1 : 0.4,
          x: '-50%',
          scale: expanded ? 1 : 0.9,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onPointerEnter={() => setExpanded(true)}
      >
        {/* Active color indicator — always visible even when collapsed */}
        <div
          className="w-5 h-5 rounded-full mr-1 border border-white/20 flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              className="flex items-center gap-1"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tool buttons */}
              {GHOST_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <motion.button
                    key={tool.id}
                    onClick={() => setTool(tool.id)}
                    className={`
                      relative w-9 h-9 rounded-xl flex items-center justify-center
                      transition-colors duration-150 select-none
                      ${
                        isActive
                          ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                    whileTap={{ scale: 0.88 }}
                    aria-label={tool.label}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                    {isActive && (
                      <motion.div
                        layoutId="ghost-indicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* Separator */}
              <div className="w-px h-6 bg-white/10 mx-0.5" />

              {/* Margin rules trigger */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowRules(!showRules)}
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center
                    transition-colors duration-150 select-none
                    ${
                      showRules
                        ? 'bg-white/15 text-white'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }
                  `}
                  whileTap={{ scale: 0.88 }}
                  aria-label="Margin rules"
                >
                  {marginRule === 'dots' ? (
                    <Grid3X3 className="w-4 h-4" strokeWidth={1.8} />
                  ) : marginRule === 'lines' ? (
                    <AlignJustify className="w-4 h-4" strokeWidth={1.8} />
                  ) : (
                    <X className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </motion.button>

                {/* Rules flyout */}
                <AnimatePresence>
                  {showRules && (
                    <motion.div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                        flex gap-1.5 p-2
                        bg-zinc-900/90 backdrop-blur-2xl rounded-xl
                        border border-white/[0.06]
                        shadow-[0_12px_24px_-4px_rgba(0,0,0,0.5)]"
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.9 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    >
                      {MARGIN_RULES.map((rule) => {
                        const RuleIcon = rule.icon;
                        const isActive = marginRule === rule.id;
                        return (
                          <motion.button
                            key={rule.id}
                            onClick={() => {
                              setMarginRule(rule.id);
                              setShowRules(false);
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-white/40 hover:text-white/70'
                            }`}
                            whileTap={{ scale: 0.9 }}
                          >
                            <RuleIcon className="w-5 h-5" strokeWidth={1.5} />
                            <span className="text-[8px] font-medium uppercase tracking-wider">
                              {rule.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default GhostToolbar;
