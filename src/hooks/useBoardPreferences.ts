import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BoardPrefs {
  theme: string;
  animations_enabled: boolean;
  sound_id: string | null;
  sound_volume: number;
}

const DEFAULTS: BoardPrefs = {
  theme: "golden-sunrise",
  animations_enabled: true,
  sound_id: null,
  sound_volume: 0.4,
};

export function useBoardPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    supabase
      .from("board_preferences")
      .select("theme,animations_enabled,sound_id,sound_volume")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            theme: data.theme ?? DEFAULTS.theme,
            animations_enabled: data.animations_enabled ?? DEFAULTS.animations_enabled,
            sound_id: data.sound_id ?? null,
            sound_volume: data.sound_volume ?? DEFAULTS.sound_volume,
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const savePrefs = useCallback((updates: Partial<BoardPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      if (!user) return next;
      // Debounce DB write
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        supabase
          .from("board_preferences")
          .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      }, 800);
      return next;
    });
  }, [user]);

  return { prefs, savePrefs, loaded };
}
