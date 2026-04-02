import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, RotateCcw, X } from "lucide-react";
import { getStroke } from "perfect-freehand";
import type { InkStroke } from "./InkOverlay";

/* ── Mini SVG path helper ── */
function getSvgPathFromStroke(stroke: number[][]): string {
  const len = stroke.length;
  if (len < 4) return "";
  const avg = (a: number, b: number) => (a + b) / 2;
  let d = "";
  let a = stroke[0], b = stroke[1];
  const c = stroke[2];
  d += `M ${a[0].toFixed(1)},${a[1].toFixed(1)} Q ${b[0].toFixed(1)},${b[1].toFixed(1)} ${avg(b[0], c[0]).toFixed(1)},${avg(b[1], c[1]).toFixed(1)} T`;
  for (let i = 2; i < len - 1; i++) {
    a = stroke[i]; b = stroke[i + 1];
    d += `${avg(a[0], b[0]).toFixed(1)},${avg(a[1], b[1]).toFixed(1)} `;
  }
  d += "Z";
  return d;
}

interface TrashItem {
  id: string;
  strokes: InkStroke[];
  clearedAt: Date;
}

interface InkTrashSheetProps {
  open: boolean;
  onClose: () => void;
  trashBin: TrashItem[];
  onRestore: (trashId: string) => void;
}

function StrokeThumbnail({ strokes }: { strokes: InkStroke[] }) {
  // Compute bounding box across all strokes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  const pad = 10;
  const vbW = Math.max(maxX - minX + pad * 2, 40);
  const vbH = Math.max(maxY - minY + pad * 2, 40);

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${vbW} ${vbH}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {strokes.map((s) => {
        const outline = getStroke(
          s.points.map((p) => [p.x, p.y, p.pressure]),
          { size: s.size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: false },
        );
        const pathData = getSvgPathFromStroke(outline);
        return pathData ? <path key={s.id} d={pathData} fill={s.color} opacity={0.85} /> : null;
      })}
    </svg>
  );
}

export function InkTrashSheet({ open, onClose, trashBin, onRestore }: InkTrashSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[50vh] bg-card/95 backdrop-blur-xl border-t border-border rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive/70" />
              <span className="text-sm font-semibold text-foreground">Cleared Ink</span>
              <span className="text-[0.65rem] text-muted-foreground">
                {trashBin.length} session{trashBin.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {trashBin.length === 0 ? (
              <div className="text-center py-8">
                <Trash2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No cleared ink sessions</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...trashBin].reverse().map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onRestore(item.id)}
                    className="relative group rounded-2xl border border-border/60 bg-background/60 overflow-hidden aspect-[4/3] flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="flex-1 p-2">
                      <StrokeThumbnail strokes={item.strokes} />
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border-t border-border/30">
                      <span className="text-[0.6rem] text-muted-foreground">
                        {item.strokes.length} stroke{item.strokes.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[0.6rem] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <RotateCcw className="h-3 w-3" /> Restore
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
