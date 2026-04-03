import { useState, useCallback } from "react";

const STORAGE_KEY = "bible_custom_palette";
const MAX_COLORS = 24;

function loadColors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

export function useCustomPalette() {
  const [colors, setColors] = useState<string[]>(loadColors);

  const persist = useCallback((next: string[]) => {
    setColors(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const addColor = useCallback((hex: string) => {
    setColors((prev) => {
      const normalized = hex.toUpperCase();
      if (prev.includes(normalized)) return prev;
      const next = [normalized, ...prev].slice(0, MAX_COLORS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeColor = useCallback((hex: string) => {
    setColors((prev) => {
      const next = prev.filter((c) => c !== hex.toUpperCase());
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const reorderColors = useCallback((newOrder: string[]) => {
    persist(newOrder.slice(0, MAX_COLORS));
  }, [persist]);

  return { colors, addColor, removeColor, reorderColors };
}
