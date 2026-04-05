/**
 * BentoExpansionPanel.tsx — Tool settings popover for Canvas Studio Mode
 *
 * Opens when user taps an already-active tool in StudioToolbar.
 * Bento-grid layout with:
 *   - Brush style selector (fountain/technical/wash/marker)
 *   - Size, Opacity, Smoothing sliders
 *   - Recent color strip
 *   - Live SVG filter preview stroke
 *
 * DESIGN: Glass Blur 2026 aesthetic matching SessionDetailDashboard.
 *   bg-zinc-900/90 backdrop-blur-[64px] — same blur radius as Bento dashboard
 *
 * iPadOS: Replace with UIMenu attached to the toolbar button, or a
 *         custom UIPopoverPresentationController with .medium() detent.
 *         Brush style → PKInkingTool selection
 *         Sliders → UISlider in the popover
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Pen, PenTool, Droplets, Minus } from 'lucide-react';
import { usePencilTools, type BrushStyle } from '@/hooks/usePencilTools';

// ─── Brush Definitions ───────────────────────────────────────────────────────

interface BrushDef {
  id: BrushStyle;
  label: string;
  icon: React.ElementType;
}

const BRUSHES: BrushDef[] = [
  { id: 'fountain', label: 'Fountain', icon: Pen },
  { id: 'technical', label: 'Technical', icon: PenTool },
  { id: 'wash', label: 'Wash', icon: Droplets },
  { id: 'marker', label: 'Marker', icon: Minus },
];

// ─── Slider Component ────────────────────────────────────────────────────────

interface BentoSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

const BentoSlider: React.FC<BentoSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
}) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">
          {label}
        </span>
        <span className="text-[11px] font-mono text-white/60 tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-1 rounded-full bg-white/10" />
        {/* Track fill */}
        <div
          className="absolute h-1 rounded-full bg-amber-400/70"
          style={{ width: `${pct}%` }}
        />
        {/* Native range input (invisible, handles interaction) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-6 opacity-0 cursor-pointer"
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/30 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
};

// ─── Color Swatch ────────────────────────────────────────────────────────────

const ColorSwatch: React.FC<{
  color: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ color, isActive, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
      isActive
        ? 'border-white scale-110 shadow-lg'
        : 'border-white/20 hover:border-white/40'
    }`}
    style={{ backgroundColor: color }}
    whileTap={{ scale: 0.85 }}
    aria-label={`Select color ${color}`}
  />
);

// ─── Main Panel ──────────────────────────────────────────────────────────────

interface BentoExpansionPanelProps {
  onClose: () => void;
}

const BentoExpansionPanel: React.FC<BentoExpansionPanelProps> = ({ onClose }) => {
  const {
    brushStyle,
    setBrushStyle,
    size,
    setSize,
    opacity,
    setOpacity,
    smoothing,
    setSmoothing,
    color,
    setColor,
    recentColors,
  } = usePencilTools();

  // Map brushStyle to a filter preview frequency
  const previewFreq = brushStyle === 'wash' ? '0.03' : brushStyle === 'marker' ? '0.15' : '0.8';
  const previewScale = brushStyle === 'wash' ? 6 : brushStyle === 'marker' ? 2.5 : 1.5;
  const previewBlur = brushStyle === 'wash' ? 1.8 : brushStyle === 'marker' ? 0.5 : 0.25;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72
        bg-zinc-900/90 backdrop-blur-[64px] saturate-150 rounded-2xl
        border border-white/[0.08]
        shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]
        p-4 z-[60]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Brush Style Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {BRUSHES.map((b) => {
          const Icon = b.icon;
          const isActive = brushStyle === b.id;
          return (
            <motion.button
              key={b.id}
              onClick={() => setBrushStyle(b.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className="w-5 h-5" strokeWidth={1.8} />
              <span className="text-[9px] font-medium">{b.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="h-px bg-white/[0.06] mb-4" />

      {/* ── Sliders ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <BentoSlider
          label="Size"
          value={size}
          min={0.5}
          max={12}
          step={0.5}
          onChange={setSize}
          unit="px"
        />
        <BentoSlider
          label="Opacity"
          value={opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={setOpacity}
        />
        <BentoSlider
          label="Smoothing"
          value={smoothing}
          min={0}
          max={1}
          step={0.1}
          onChange={setSmoothing}
        />
      </div>

      <div className="h-px bg-white/[0.06] my-4" />

      {/* ── Recent Colors ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {recentColors.map((c, i) => (
          <ColorSwatch
            key={`${c}-${i}`}
            color={c}
            isActive={color === c}
            onClick={() => setColor(c)}
          />
        ))}
        <div className="flex-1" />
        <span className="text-[9px] text-white/30 font-mono">{color}</span>
      </div>

      {/* ── Live Filter Preview ─────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-semibold">
          Preview
        </span>
        <div className="flex-1 h-8 rounded-lg bg-white/5 overflow-hidden relative">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <filter
                id="bento-preview-filter"
                x="-10%"
                y="-10%"
                width="120%"
                height="120%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={previewFreq}
                  numOctaves={brushStyle === 'wash' ? 4 : 3}
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={previewScale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
                <feGaussianBlur stdDeviation={previewBlur} />
              </filter>
            </defs>
            <path
              d="M10,20 Q40,5 70,18 Q100,30 130,15 Q160,5 190,20 Q210,30 240,16"
              stroke={color}
              strokeWidth={
                size * (brushStyle === 'wash' ? 4 : brushStyle === 'marker' ? 2.5 : 1.5)
              }
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              filter="url(#bento-preview-filter)"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default BentoExpansionPanel;
