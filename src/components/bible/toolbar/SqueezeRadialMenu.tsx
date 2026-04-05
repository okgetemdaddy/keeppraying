/**
 * SqueezeRadialMenu.tsx — Radial tool picker triggered by Apple Pencil Pro squeeze
 *
 * Renders at the squeeze position (passed from useApplePencilSqueeze hook).
 * Shows 4 tools in a radial layout with spring animations.
 * Selecting a tool updates usePencilTools store and closes the menu.
 *
 * MOUNT: In BibleReader.tsx, always mounted (renders null when closed).
 * WIRING:
 *   import { useApplePencilSqueeze } from '@/hooks/useApplePencilSqueeze';
 *   import { usePencilTools } from '@/hooks/usePencilTools';
 *   
 *   const tools = usePencilTools();
 *   useApplePencilSqueeze((x, y) => tools.toggleSqueezeMenu(x, y));
 *
 * iPadOS: Remove entirely. Replace with:
 *   UIPencilInteraction.preferredToolPicker = .inkingToolPicker
 *   (System tool picker renders natively)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, Highlighter, Eraser, Lasso } from 'lucide-react';
import { usePencilTools, type ToolType } from '@/hooks/usePencilTools';

interface RadialTool {
  id: ToolType;
  icon: React.ElementType;
  label: string;
}

const TOOLS: RadialTool[] = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'lasso', icon: Lasso, label: 'Lasso' },
];

const RADIUS = 64; // px from center

const SqueezeRadialMenu: React.FC = () => {
  const {
    isSqueezeMenuOpen,
    squeezePosition,
    activeTool,
    setTool,
    closeSqueezeMenu,
  } = usePencilTools();

  if (!isSqueezeMenuOpen) return null;

  return (
    <AnimatePresence>
      {isSqueezeMenuOpen && (
        <motion.div
          key="squeeze-backdrop"
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSqueezeMenu}
          // iPadOS: This backdrop maps to a UIVisualEffectView dimming layer
        >
          <motion.div
            className="absolute"
            style={{
              left: squeezePosition.x,
              top: squeezePosition.y,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          >
            {/* Center dot — squeeze origin indicator */}
            <div className="absolute w-3 h-3 rounded-full bg-amber-400/60 -translate-x-1.5 -translate-y-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)]" />

            {/* Radial tool buttons */}
            {TOOLS.map((tool, i) => {
              const angle =
                (i / TOOLS.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * RADIUS;
              const y = Math.sin(angle) * RADIUS;
              const isActive = activeTool === tool.id;
              const Icon = tool.icon;

              return (
                <motion.button
                  key={tool.id}
                  className={`
                    absolute w-12 h-12 rounded-2xl
                    flex items-center justify-center
                    -translate-x-6 -translate-y-6
                    shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]
                    border backdrop-blur-xl
                    transition-colors duration-100
                    ${
                      isActive
                        ? 'bg-white/20 border-amber-400/40 text-white'
                        : 'bg-zinc-900/80 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }
                  `}
                  style={{ left: x, top: y }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    delay: i * 0.04,
                    type: 'spring',
                    damping: 20,
                    stiffness: 400,
                  }}
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTool(tool.id);
                    closeSqueezeMenu();
                  }}
                  aria-label={tool.label}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SqueezeRadialMenu;
