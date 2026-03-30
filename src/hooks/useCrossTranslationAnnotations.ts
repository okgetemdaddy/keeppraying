import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "bible_cross_translation_annotations";

function getLocal(): boolean {
  try { return localStorage.getItem(LS_KEY) === "true"; } catch { return false; }
}

/**
 * Manages the "cross-translation annotations" preference.
 * When enabled, highlights/notes/bookmarks show across all Bible translations
 * instead of being version-specific.
 * 
 * Persisted to board_preferences for auth users, localStorage for guests.
 */
export function useCrossTranslationAnnotations() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(getLocal);
  const [loaded, setLoaded] = useState(false);

  // Load from DB for auth users
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    supabase
      .from("board_preferences")
      .select("cross_translation_annotations")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof (data as any).cross_translation_annotations === "boolean") {
          const val = (data as any).cross_translation_annotations;
          setEnabled(val);
          try { localStorage.setItem(LS_KEY, String(val)); } catch {}
        }
        setLoaded(true);
      });
  }, [user]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      if (user) {
        supabase
          .from("board_preferences")
          .upsert(
            { user_id: user.id, cross_translation_annotations: next } as any,
            { onConflict: "user_id" },
          )
          .then(() => {});
      }
      return next;
    });
  }, [user]);

  const setDirectly = useCallback((val: boolean) => {
    setEnabled(val);
    try { localStorage.setItem(LS_KEY, String(val)); } catch {}
    if (user) {
      supabase
        .from("board_preferences")
        .upsert(
          { user_id: user.id, cross_translation_annotations: val } as any,
          { onConflict: "user_id" },
        )
        .then(() => {});
    }
  }, [user]);

  return { enabled, toggle, setDirectly, loaded };
}
