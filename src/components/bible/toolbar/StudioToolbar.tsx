/**
 * StudioToolbar.tsx — "The Studio Bar" for Canvas Session Mode
 *
 * REPLACES: iPadStudyToolbar.tsx (416 lines) for canvas mode
 * MOUNTS WHEN: isInPaperCanvas === true && activeSessionConfig exists
 *
 * Design: Draggable floating palette, 2.5D spatial layout.
 *   - Drag handle (grip icon) for repositioning
 *   - Tool row: Pen, Highlighter, Eraser, Lasso
 *   - Compact color strip (3 recent colors)
 *   - Undo/Redo buttons (wire to useInkHistory)
 *   - Pencil Pro squeeze indicator (breathing animation)
 *   - Tap active tool → opens BentoExpansionPanel
 *
 * INTEGRATION:
 *   // In BibleReader.tsx, inside the canvas session branch:
 *   {isInPaperCanvas && activeSessionConfig && (
 *     <StudioToolbar
 *       onUndo={inkHistory.undo}
 *       onRedo={inkHistory.redo}
 *       canUndo={inkHistory.canUndo}
 *       canRedo={inkHistory.canRedo}
 *     />
 *   )}
 *
 * iPadOS: Replace with a floating UIToolbar (UINavigationBar style)
 *         using UIBarButtonItem for each tool.
 *         Drag → UIPanGestureRecognizer on the toolbar view.
 *         Bento panel → UIPopoverPresentationController.
 *         Pencil Pro → UIPencilInteraction.preferredToolPicker.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Pen,
  Highlighter,
  Eraser,
  Lasso,
  Undo2,
  Redo2,
  GripVertical,
} from 'lucide-react';
import { usePencilTools, type ToolType } from '@/hooks/usePencilTools';
import BentoExpansionPanel from './BentoExpansionPanel';

// ─── Tool Definitions ────────────────────────────────────────────────────────

interface StudioTool {
  id: ToolType;
  icon: React.ElementType;
  label: string;
}

const STUDIO_TOOLS: StudioTool[] = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'lasso', icon: Lasso, label: 'Lasso' },
];

// ─── Apple Pencil Pro Icon ───────────────────────────────────────────────────

const PencilProIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17.5 2.5a2.12 2.12 0 0 1 3 3L8 18l-4.5 1.5L5 15Z" />
    <path d="m15 4.5 3 3" />
    <circle cx="19" cy="19" r="2" fill="currentColor" opacity={0.4} />
  </svg>
);

// ─── Props ───────────────────────────────────────────────────────────────────

interface StudioToolbarProps {
  /** Wire to useInkHistory().undo */
  onUndo?: () => void;
  /** Wire to useInkHistory().redo */
  onRedo?: () => void;
  /** Wire to useInkHistory().canUndo */
  canUndo?: boolean;
  /** Wire to useInkHistory().canRedo */
  canRedo?: boolean;
}

// ─── Studio Toolbar Component ────────────────────────────────────────────────

const StudioToolbar: React.FC<StudioToolbarProps> = ({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const {
    activeTool,
    setTool,
    color,
    setColor,
    recentColors,
  } = usePencilTools();

  const [showExpansion, setShowExpansion] = useState(false);
  const dragControls = useDragControls();

  const handleToolTap = useCallback(
    (toolId: ToolType) => {
      if (activeTool === toolId) {
        // Tap already-active tool → toggle bento expansion
        setShowExpansion((prev) => !prev);
      } else {
        setTool(toolId);
        setShowExpansion(false);
      }
    },
    [activeTool, setTool]
  );

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.08}
      dragListener={false} // Only drag from grip handle
      className="fixed top-8 left-1/2 z-50 select-none"
      style={{ x: '-50%' }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="relative">
        {/* ── Main Bar ──────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 px-2 py-2
            bg-zinc-900/85 backdrop-blur-3xl rounded-2xl
            border border-white/[0.08]
            shadow-[0_20px_48px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          {/* Drag handle */}
          <div
            className="w-5 h-8 cursor-grab active:cursor-grabbing flex items-center justify-center flex-shrink-0 mr-1"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <GripVertical className="w-4 h-4 text-white/20" strokeWidth={1.5} />
          </div>

          {/* Tool buttons */}
          {STUDIO_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <motion.button
                key={tool.id}
                onClick={() => handleToolTap(tool.id)}
                className={`
                  relative w-10 h-10 rounded-xl flex items-center justify-center
                  transition-colors duration-150 select-none
                  ${
                    isActive
                      ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.3)]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }
                `}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                aria-label={tool.label}
              >
                <Icon className="w-5 h-5" strokeWidth={1.8} />
                {isActive && (
                  <motion.div
                    layoutId="studio-indicator"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-8 bg-white/[0.06] mx-1" />

          {/* Compact color strip */}
          <div className="flex items-center gap-1.5 mx-1">
            {recentColors.slice(0, 3).map((c, i) => (
              <motion.button
                key={`${c}-${i}`}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                  color === c
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{ backgroundColor: c }}
                whileTap={{ scale: 0.85 }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-white/[0.06] mx-1" />

          {/* Undo / Redo */}
          <motion.button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-9 h-9 rounded-xl flex items-center justify-center select-none
              ${canUndo ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-white/20 cursor-not-allowed'}`}
            whileTap={canUndo ? { scale: 0.88 } : {}}
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" strokeWidth={1.8} />
          </motion.button>
          <motion.button
            onClick={onRedo}
            disabled={!canRedo}
            className={`w-9 h-9 rounded-xl flex items-center justify-center select-none
              ${canRedo ? 'text-white/50 hover:text-white/80 hover:bg-white/5' : 'text-white/20 cursor-not-allowed'}`}
            whileTap={canRedo ? { scale: 0.88 } : {}}
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" strokeWidth={1.8} />
          </motion.button>

          {/* Apple Pencil Pro squeeze indicator */}
          <div className="ml-1 w-px h-8 bg-white/[0.06]" />
          <motion.div
            className="w-8 h-8 flex items-center justify-center text-amber-400/40 rounded-lg"
            title="Apple Pencil Pro — squeeze for radial menu"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PencilProIcon className="w-4 h-4" />
          </motion.div>
        </div>

        {/* ── Bento Expansion Panel ────────────────────────────────── */}
        <AnimatePresence>
          {showExpansion && (
            <BentoExpansionPanel onClose={() => setShowExpansion(false)} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default StudioToolbar;
