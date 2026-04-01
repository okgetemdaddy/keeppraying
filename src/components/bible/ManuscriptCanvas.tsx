import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Move, PenTool, RotateCcw, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandwritingEngine, type HandwritingEngineHandle, type StrokeData } from "./HandwritingEngine";

interface ManuscriptCanvasProps {
  /** Chapter title, e.g. "Genesis 1" */
  chapterTitle?: string;
  /** All verse texts for the chapter background */
  verses?: { number: number; text: string }[];
  /** Existing strokes for this chapter */
  initialStrokes?: StrokeData[];
  /** Called when user saves */
  onSave?: (strokes: StrokeData[]) => void;
  /** Close the canvas */
  onClose: () => void;
  /** Text size from reader */
  textSize?: number;
}

export function ManuscriptCanvas({
  chapterTitle,
  verses = [],
  initialStrokes = [],
  onSave,
  onClose,
  textSize = 18,
}: ManuscriptCanvasProps) {
  const engineRef = useRef<HandwritingEngineHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

  // Canvas dimensions — generous height for scrollable manuscript feel
  const canvasWidth = 1200;
  const canvasHeight = Math.max(2400, verses.length * 80);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Pinch-to-zoom via wheel/gesture
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
      } else if (panMode) {
        e.preventDefault();
        setPanOffset((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [panMode]);

  // Multi-touch pinch-to-zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      } else if (e.touches.length === 1 && panMode) {
        lastPanPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setIsPanning(true);
      }
    },
    [panMode],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (dist - lastPinchDist.current) * 0.008;
        setScale((s) => Math.max(0.5, Math.min(4, s + delta)));
        lastPinchDist.current = dist;
      } else if (e.touches.length === 1 && isPanning && lastPanPoint.current) {
        const dx = e.touches[0].clientX - lastPanPoint.current.x;
        const dy = e.touches[0].clientY - lastPanPoint.current.y;
        setPanOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
        lastPanPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [isPanning],
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPanPoint.current = null;
    setIsPanning(false);
  }, []);

  const handleStrokesChange = useCallback(
    (strokes: StrokeData[]) => {
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (engineRef.current && onSave) {
      onSave(engineRef.current.getStrokes());
      setDirty(false);
    }
  }, [onSave]);

  const handleUndo = useCallback(() => {
    engineRef.current?.undo();
  }, []);

  const handleClear = useCallback(() => {
    engineRef.current?.clear();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                {chapterTitle ?? "Manuscript Canvas"}
              </span>
              <span className="text-[0.6rem] text-muted-foreground">
                Mode 2 · Infinite Canvas · {Math.round(scale * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Pan/Draw toggle */}
            <Button
              variant={panMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setPanMode(!panMode)}
              className="h-8 w-8 p-0"
              title={panMode ? "Switch to draw" : "Switch to pan"}
            >
              {panMode ? <Move className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0" title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-[0.65rem] font-mono text-muted-foreground w-8 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0" title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetView} className="h-8 w-8 p-0" title="Reset view">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 w-8 p-0" title="Undo">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0 text-destructive" title="Clear all">
              <Trash2 className="h-4 w-4" />
            </Button>

            {onSave && (
              <Button
                variant={dirty ? "default" : "ghost"}
                size="sm"
                onClick={handleSave}
                className="h-8 px-3 gap-1.5"
                title="Save annotations"
              >
                <Save className="h-3.5 w-3.5" />
                <span className="text-xs">Save</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Canvas area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: panMode ? "grab" : "crosshair" }}
        >
          <div
            className="origin-top-left"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
              width: canvasWidth,
              height: canvasHeight,
            }}
          >
            {/* Faded verse text as manuscript background */}
            <div
              className="absolute inset-0 px-16 py-12 pointer-events-none select-none"
              style={{ fontSize: textSize }}
            >
              <h2 className="text-lg font-serif font-semibold text-muted-foreground/30 mb-6">
                {chapterTitle}
              </h2>
              <div className="space-y-3">
                {verses.map((v) => (
                  <p key={v.number} className="leading-[2.8] text-muted-foreground/20 font-serif">
                    <sup className="text-[0.65rem] mr-1 font-semibold">{v.number}</sup>
                    {v.text}
                  </p>
                ))}
              </div>
            </div>

            {/* Drawing layer on top */}
            <div className={`absolute inset-0 ${panMode ? "pointer-events-none" : ""}`}>
              <HandwritingEngine
                ref={engineRef}
                width={canvasWidth}
                height={canvasHeight}
                variant="infinite"
                initialStrokes={initialStrokes}
                onChange={handleStrokesChange}
                showToolbar={true}
                className="!border-0 !rounded-none !bg-transparent !shadow-none"
              />
            </div>
          </div>
        </div>

        {/* ── Keyboard shortcuts hint ── */}
        <div className="flex items-center justify-center gap-4 py-1.5 bg-muted/50 border-t border-border text-[0.6rem] text-muted-foreground shrink-0">
          <span>⌘Z Undo</span>
          <span>Ctrl+Scroll to zoom</span>
          <span>Pinch to zoom on touch</span>
          <span className="hidden sm:inline">Space+Drag to pan</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
