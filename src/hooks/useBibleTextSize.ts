import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "bible_text_size";
const DEFAULT_SIZE = 18;
const MIN_SIZE = 14;
const MAX_SIZE = 28;

function getLocalSize(): number {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) return Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(v, 10)));
  } catch {}
  return DEFAULT_SIZE;
}

export function useBibleTextSize() {
  const { user } = useAuth();
  const [size, setSize] = useState(getLocalSize);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB for auth users
  useEffect(() => {
    if (!user) return;
    supabase
      .from("board_preferences")
      .select("bible_text_size")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).bible_text_size) {
          const dbSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, (data as any).bible_text_size));
          setSize(dbSize);
          try { localStorage.setItem(LS_KEY, String(dbSize)); } catch {}
        }
      });
  }, [user]);

  const setTextSize = useCallback(
    (newSize: number) => {
      const clamped = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newSize));
      setSize(clamped);
      try { localStorage.setItem(LS_KEY, String(clamped)); } catch {}

      if (user) {
        if (saveRef.current) clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
          supabase
            .from("board_preferences")
            .upsert(
              { user_id: user.id, bible_text_size: clamped } as any,
              { onConflict: "user_id" }
            )
            .then(() => {});
        }, 600);
      }
    },
    [user],
  );

  return { size, setTextSize, MIN_SIZE, MAX_SIZE };
}
