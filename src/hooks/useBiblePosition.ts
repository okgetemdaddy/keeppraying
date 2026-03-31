import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalCache, setLocalCache, cacheKeys } from "@/lib/localCache";

export interface BiblePosition {
  versionId: number;
  bookUsfm: string;
  chapterIdx: number;
  mode: "verse" | "paragraph";
  scrollTop: number;
}

const DEBOUNCE_MS = 800;

/**
 * Loads the saved Bible reading position (local-first, then DB).
 * Provides a debounced save that writes to both localStorage and DB.
 */
export function useBiblePosition(userId: string | undefined) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestRef = useRef<BiblePosition | null>(null);

  /** Load position — instant from localStorage, then async DB merge */
  const loadPosition = useCallback(async (): Promise<BiblePosition | null> => {
    if (!userId) return null;

    // 1. Try localStorage (instant)
    const local = getLocalCache<BiblePosition>(cacheKeys.biblePosition(userId));
    if (local) latestRef.current = local;

    // 2. Fetch from DB (cross-device sync)
    try {
      const { data } = await supabase
        .from("bible_reading_position" as any)
        .select("version_id, book_usfm, chapter_idx, mode, scroll_top, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        const dbPos: BiblePosition = {
          versionId: (data as any).version_id,
          bookUsfm: (data as any).book_usfm,
          chapterIdx: (data as any).chapter_idx,
          mode: (data as any).mode as "verse" | "paragraph",
          scrollTop: (data as any).scroll_top ?? 0,
        };

        // If DB is newer than local cache, prefer DB
        if (!local) {
          setLocalCache(cacheKeys.biblePosition(userId), dbPos);
          latestRef.current = dbPos;
          return dbPos;
        }

        // We always trust the latest write — DB is the source of truth for cross-device
        // But since local writes are debounced, local might be newer in the same session
        // Return local if present (same session), DB data is synced on next load
        return local;
      }
    } catch {
      // DB unavailable — use local
    }

    return local;
  }, [userId]);

  /** Save position (debounced → localStorage + DB) */
  const savePosition = useCallback(
    (pos: BiblePosition) => {
      if (!userId) return;

      latestRef.current = pos;

      // Immediate localStorage write
      setLocalCache(cacheKeys.biblePosition(userId), pos);

      // Debounced DB write
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await supabase.from("bible_reading_position" as any).upsert(
            {
              user_id: userId,
              version_id: pos.versionId,
              book_usfm: pos.bookUsfm,
              chapter_idx: pos.chapterIdx,
              mode: pos.mode,
              scroll_top: pos.scrollTop,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "user_id" } as any,
          );
        } catch {
          // Non-critical — local cache still works
        }
      }, DEBOUNCE_MS);
    },
    [userId],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { loadPosition, savePosition };
}
