/**
 * DrawCanvasFullscreen — Fullscreen handwriting prayer canvas.
 * Pressure-sensitive calligraphy via perfect-freehand.
 * 8-color palette, 3 thickness presets, undo/redo, save → ink-ocr → prayer card.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { getStroke } from "perfect-freehand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  X, Undo2, Redo2, Pen, Highlighter, Eraser, Save, Loader2,
} from "lucide-react";

interface Stroke {
  id: string;
  points: number[][];
  color: string;
  size: number;
  tool: "pen" | "highlighter" | "eraser";
}

interface DrawCanvasFullscreenProps {
  open: boolean;
  onClose: () => void;
  onPrayerCreated?: () => void;
}

const COLORS = [
  { id: "gold", value: "#b48c32" },
  { id: "cream", value: "#f5e6c8" },
  { id: "green", value: "#22c55e" },
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#8b5cf6" },
  { id: "red", value: "#ef4444" },
  { id: "yellow", value: "#facc15" },
  { id: "muted", value: "#94a3b8" },
];

const SIZES = [
  { id: "thin", value: 2, label: "·" },
  { id: "medium", value: 4, label: "•" },
  { id: "bold", value: 8, label: "●" },
];

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );
  d.push("Z");
  return d.join(" ");
}

export function DrawCanvasFullscreen({ open, onClose, onPrayerCreated }: DrawCanvasFullscreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activeSize, setActiveSize] = useState(SIZES[1].value);
  const [activeTool, setActiveTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [saving, setSaving] = useState(false);

  const pushUndo = useCallback((snapshot: Stroke[]) => {
    setUndoStack((prev) => [...prev.slice(-49), snapshot]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, strokes]);
      setStrokes(last);
      return prev.slice(0, -1);
    });
  }, [strokes]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, strokes]);
      setStrokes(last);
      return prev.slice(0, -1);
    });
  }, [strokes]);

  const getPointerPos = (e: React.PointerEvent): number[] => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0, 0.5];
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === "eraser") {
      // Find and remove stroke at this point
      const pos = getPointerPos(e);
      const hitIdx = strokes.findIndex((s) =>
        s.points.some(
          (p) => Math.abs(p[0] - pos[0]) < 15 && Math.abs(p[1] - pos[1]) < 15
        )
      );
      if (hitIdx >= 0) {
        pushUndo([...strokes]);
        setStrokes((prev) => prev.filter((_, i) => i !== hitIdx));
      }
      return;
    }
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    setCurrentPoints([getPointerPos(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setCurrentPoints((prev) => [...prev, getPointerPos(e)]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 1) {
      pushUndo([...strokes]);
      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        points: currentPoints,
        color: activeColor,
        size: activeSize,
        tool: activeTool,
      };
      setStrokes((prev) => [...prev, newStroke]);
    }
    setCurrentPoints([]);
  };

  const renderStroke = (stroke: Stroke) => {
    const outlinePoints = getStroke(stroke.points, {
      size: stroke.size * (stroke.tool === "highlighter" ? 3 : 1),
      thinning: stroke.tool === "highlighter" ? 0 : 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    return (
      <path
        key={stroke.id}
        d={getSvgPathFromStroke(outlinePoints)}
        fill={stroke.color}
        opacity={stroke.tool === "highlighter" ? 0.3 : 1}
        style={stroke.tool === "highlighter" ? { mixBlendMode: "multiply" } : undefined}
      />
    );
  };

  const renderCurrentStroke = () => {
    if (currentPoints.length < 2) return null;
    const outlinePoints = getStroke(currentPoints, {
      size: activeSize * (activeTool === "highlighter" ? 3 : 1),
      thinning: activeTool === "highlighter" ? 0 : 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    return (
      <path
        d={getSvgPathFromStroke(outlinePoints)}
        fill={activeColor}
        opacity={activeTool === "highlighter" ? 0.3 : 1}
      />
    );
  };

  const handleSave = async () => {
    if (!user || strokes.length === 0) return;
    setSaving(true);
    try {
      // Export SVG to data URL
      const svgEl = svgRef.current;
      if (!svgEl) throw new Error("No canvas");
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml" });

      // Try OCR
      let extractedText = "Handwritten prayer";
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(svgBlob);
        });
        const { data: ocrData } = await supabase.functions.invoke("ink-ocr", {
          body: { image_base64: base64 },
        });
        if (ocrData?.text) extractedText = ocrData.text;
      } catch {
        // OCR failed — use fallback text
      }

      // Save prayer card
      const { data: card, error } = await supabase
        .from("prayer_cards")
        .insert({
          prayer_text: extractedText,
          created_by: user.id,
          status: "private",
          source: "drawn",
          prayer_type: "personal",
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("user_saved_prayers").insert({
        user_id: user.id,
        prayer_id: card.id,
        pinned: false,
        favorite: false,
      });

      toast({ title: "Drawn prayer saved 🎨🙏", description: "Your handwritten prayer has been captured." });
      onPrayerCreated?.();
      onClose();
      setStrokes([]);
      setUndoStack([]);
      setRedoStack([]);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ backgroundColor: "var(--kp-bg-deep)" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--kp-border)" }}
      >
        <button onClick={onClose} className="p-2 rounded-xl" style={{ color: "var(--kp-text-muted)" }}>
          <X className="w-5 h-5" />
        </button>
        <h2
          className="text-sm font-bold"
          style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}
        >
          Draw Your Prayer
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={undoStack.length === 0} className="p-2 rounded-xl disabled:opacity-30" style={{ color: "var(--kp-text-muted)" }}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="p-2 rounded-xl disabled:opacity-30" style={{ color: "var(--kp-text-muted)" }}>
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ touchAction: "none" }}>
        {/* Guide lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {Array.from({ length: 30 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1={40 + i * 32}
              x2="100%"
              y2={40 + i * 32}
              stroke="var(--kp-border)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
        </svg>

        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: activeTool === "eraser" ? "crosshair" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {strokes.map(renderStroke)}
          {renderCurrentStroke()}
        </svg>
      </div>

      {/* Color bar */}
      <div
        className="flex items-center justify-center gap-2.5 px-4 py-2.5"
        style={{ borderTop: "1px solid var(--kp-border)" }}
      >
        {COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveColor(c.value)}
            className="w-7 h-7 rounded-full transition-all"
            style={{
              backgroundColor: c.value,
              boxShadow: activeColor === c.value ? `0 0 0 2px var(--kp-bg-deep), 0 0 0 4px ${c.value}` : "none",
              transform: activeColor === c.value ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Tool + Size + Save bar */}
      <div
        className="flex items-center justify-between px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]"
        style={{ borderTop: "1px solid var(--kp-border)", backgroundColor: "var(--kp-bg-surface)" }}
      >
        {/* Tool buttons */}
        <div className="flex gap-1.5">
          {[
            { id: "pen" as const, icon: Pen, label: "Pen" },
            { id: "highlighter" as const, icon: Highlighter, label: "Highlight" },
            { id: "eraser" as const, icon: Eraser, label: "Erase" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className="p-2 rounded-xl transition-all"
              style={{
                backgroundColor: activeTool === t.id ? "rgba(180,140,50,0.15)" : "transparent",
                color: activeTool === t.id ? "var(--kp-gold)" : "var(--kp-text-muted)",
              }}
            >
              <t.icon className="w-4.5 h-4.5" />
            </button>
          ))}
        </div>

        {/* Size buttons */}
        <div className="flex gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSize(s.value)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
              style={{
                backgroundColor: activeSize === s.value ? "rgba(180,140,50,0.15)" : "transparent",
                color: activeSize === s.value ? "var(--kp-gold)" : "var(--kp-text-muted)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={strokes.length === 0 || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.96] disabled:opacity-40"
          style={{
            backgroundColor: strokes.length > 0 ? "var(--kp-gold)" : "var(--kp-bg-elevated)",
            color: strokes.length > 0 ? "var(--kp-bg-deep)" : "var(--kp-text-muted)",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </motion.div>
  );
}
