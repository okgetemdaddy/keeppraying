import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MinimapStroke, MinimapHighlight } from "@/lib/minimap";

// iPadOS: Replace with CoreData local sync for zero-latency access

export interface ChapterAnnotationData {
  strokes: MinimapStroke[];
  highlights: MinimapHighlight[];
  lastEditedAt: string | null;
}

/**
 * Converts an array of {x, y} points into an SVG path data string.
 * Used to transform stored stroke point arrays into minimap-renderable paths.
 */
function pointsToPathData(points: Array<{ x: number; y: number }>): string {
  if (!points || points.length === 0) return "";
  const first = points[0];
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

/**
 * Eagerly prefetches ALL annotations for the current book on mount.
 * The Chapter Thumbnail Drawer needs instant access to every chapter's
 * cumulative annotation data with zero loading delay.
 *
 * Uses a single Supabase query filtered client-side by verse_ids prefix.
 */
export function useBookAnnotations(bookUsfm: string | undefined) {
  const { user } = useAuth();
  const [chapterAnnotations, setChapterAnnotations] = useState<Map<number, ChapterAnnotationData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const lastBookRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookUsfm || !user) return;
    if (lastBookRef.current === bookUsfm) return;
    lastBookRef.current = bookUsfm;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        // Fetch all annotations for this user, then client-side filter by book prefix
        // The annotations table uses verse_ids (string[]) — we filter entries
        // whose verse_ids contain values starting with the book USFM code
        const { data } = await supabase
          .from("annotations")
          .select("verse_ids, strokes, updated_at")
          .eq("user_id", user.id);

        if (!data) { setIsLoading(false); return; }

        const map = new Map<number, ChapterAnnotationData>();
        const bookPrefix = `${bookUsfm}.`;

        for (const row of data) {
          if (!row.verse_ids || !Array.isArray(row.verse_ids)) continue;

          // Check if any verse_id belongs to this book
          const matchingIds = row.verse_ids.filter((vid: string) => vid.startsWith(bookPrefix));
          if (matchingIds.length === 0) continue;

          // Extract chapter number from the first matching verse_id
          // Pattern: "GEN.1.ink", "GEN.1.3", "GEN.1.margin_ink" → chapter 1
          const firstMatch = matchingIds[0];
          const parts = firstMatch.substring(bookPrefix.length).split(".");
          const chapterNum = parseInt(parts[0], 10);
          if (isNaN(chapterNum)) continue;

          const existing = map.get(chapterNum) || { strokes: [], highlights: [], lastEditedAt: null };

          // Track most recent edit time
          if (!existing.lastEditedAt || (row.updated_at && row.updated_at > existing.lastEditedAt)) {
            existing.lastEditedAt = row.updated_at;
          }

          // Extract strokes from the strokes JSON column
          try {
            const strokes = row.strokes;
            if (Array.isArray(strokes)) {
              for (const stroke of strokes) {
                // Strokes are stored as StrokeData with point arrays
                if (stroke.points && Array.isArray(stroke.points) && stroke.points.length > 0) {
                  existing.strokes.push({
                    pathData: pointsToPathData(stroke.points),
                    color: stroke.color || "#ffffff",
                    strokeWidth: stroke.size || stroke.strokeWidth || 2,
                  });
                }
              }
            }
          } catch {
            // Malformed strokes — skip
          }

          map.set(chapterNum, existing);
        }

        setChapterAnnotations(map);
      } catch (err) {
        console.error("Failed to prefetch book annotations:", err);
      }
      setIsLoading(false);
    };

    fetchAll();
  }, [bookUsfm, user]);

  // Invalidate a single chapter (called after edits)
  const invalidateChapter = useCallback(async (chapterNumber: number) => {
    if (!bookUsfm || !user) return;

    const { data } = await supabase
      .from("annotations")
      .select("verse_ids, strokes, updated_at")
      .eq("user_id", user.id);

    if (!data) return;

    const chapterData: ChapterAnnotationData = { strokes: [], highlights: [], lastEditedAt: null };
    const chapterPrefix = `${bookUsfm}.${chapterNumber}.`;

    for (const row of data) {
      if (!row.verse_ids || !Array.isArray(row.verse_ids)) continue;
      const hasMatch = row.verse_ids.some((vid: string) => vid.startsWith(chapterPrefix));
      if (!hasMatch) continue;

      if (!chapterData.lastEditedAt || (row.updated_at && row.updated_at > chapterData.lastEditedAt)) {
        chapterData.lastEditedAt = row.updated_at;
      }

      try {
        const strokes = row.strokes;
        if (Array.isArray(strokes)) {
          for (const stroke of strokes) {
            if (stroke.points && Array.isArray(stroke.points) && stroke.points.length > 0) {
              chapterData.strokes.push({
                pathData: pointsToPathData(stroke.points),
                color: stroke.color || "#ffffff",
                strokeWidth: stroke.size || stroke.strokeWidth || 2,
              });
            }
          }
        }
      } catch {}
    }

    setChapterAnnotations(prev => {
      const next = new Map(prev);
      next.set(chapterNumber, chapterData);
      return next;
    });
  }, [bookUsfm, user]);

  return { chapterAnnotations, isLoading, invalidateChapter };
}
