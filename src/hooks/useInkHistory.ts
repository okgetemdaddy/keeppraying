import { useState, useCallback, useRef } from "react";
import type { InkStroke } from "@/components/bible/InkOverlay";

const MAX_HISTORY = 50;

export interface InkHistoryState {
  strokes: InkStroke[];
  undoStack: InkStroke[][];
  redoStack: InkStroke[][];
  trashBin: { id: string; strokes: InkStroke[]; clearedAt: Date }[];
}

export function useInkHistory(initialStrokes: InkStroke[] = []) {
  const [strokes, setStrokes] = useState<InkStroke[]>(initialStrokes);
  const undoStackRef = useRef<InkStroke[][]>([]);
  const redoStackRef = useRef<InkStroke[][]>([]);
  const [trashBin, setTrashBin] = useState<{ id: string; strokes: InkStroke[]; clearedAt: Date }[]>([]);
  const [, forceRender] = useState(0);

  const pushUndo = useCallback((snapshot: InkStroke[]) => {
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
    redoStackRef.current = [];
  }, []);

  const addStroke = useCallback((stroke: InkStroke) => {
    setStrokes((prev) => {
      pushUndo(prev);
      return [...prev, stroke];
    });
  }, [pushUndo]);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    setStrokes((current) => {
      redoStackRef.current = [...redoStackRef.current, current];
      forceRender((n) => n + 1);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    setStrokes((current) => {
      undoStackRef.current = [...undoStackRef.current, current];
      forceRender((n) => n + 1);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      pushUndo(prev);
      setTrashBin((bin) => [
        ...bin,
        {
          id: `trash-${Date.now()}`,
          strokes: prev,
          clearedAt: new Date(),
        },
      ]);
      return [];
    });
  }, [pushUndo]);

  const restoreFromTrash = useCallback((trashId: string) => {
    setTrashBin((bin) => {
      const item = bin.find((t) => t.id === trashId);
      if (!item) return bin;
      setStrokes((prev) => {
        pushUndo(prev);
        return [...prev, ...item.strokes];
      });
      return bin.filter((t) => t.id !== trashId);
    });
  }, [pushUndo]);

  const replaceStrokes = useCallback((newStrokes: InkStroke[]) => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setStrokes(newStrokes);
  }, []);

  return {
    strokes,
    addStroke,
    undo,
    redo,
    clearAll,
    restoreFromTrash,
    replaceStrokes,
    trashBin,
    canUndo: undoStackRef.current.length > 0 || strokes.length > 0,
    canRedo: redoStackRef.current.length > 0,
    hasStrokes: strokes.length > 0,
  };
}
