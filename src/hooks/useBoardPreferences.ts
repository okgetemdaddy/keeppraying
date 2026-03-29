import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BoardPrefs {
  theme: string;
  animations_enabled: boolean;
  sound_id: string | null;
  sound_volume: number;
  theme_preset: string | null;
  theme_bg: string | null;
  theme_text: string | null;
  theme_accent: string | null;
  theme_scope: string;
}

const DEFAULTS: BoardPrefs = {
  theme: "golden-sunrise",
  animations_enabled: true,
  sound_id: null,
  sound_volume: 0.4,
  theme_preset: "Golden Sunrise",
  theme_bg: null,
  theme_text: null,
  theme_accent: null,
  theme_scope: "board",
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
      .select("theme,animations_enabled,sound_id,sound_volume,theme_preset,theme_bg,theme_text,theme_accent,theme_scope")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            theme: data.theme ?? DEFAULTS.theme,
            animations_enabled: data.animations_enabled ?? DEFAULTS.animations_enabled,
            sound_id: data.sound_id ?? null,
            sound_volume: data.sound_volume ?? DEFAULTS.sound_volume,
            theme_preset: (data as any).theme_preset ?? DEFAULTS.theme_preset,
            theme_bg: (data as any).theme_bg ?? null,
            theme_text: (data as any).theme_text ?? null,
            theme_accent: (data as any).theme_accent ?? null,
            theme_scope: (data as any).theme_scope ?? DEFAULTS.theme_scope,
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const savePrefs = useCallback((updates: Partial<BoardPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      if (!user) return next;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        supabase
          .from("board_preferences")
          .upsert({ user_id: user.id, ...next } as any, { onConflict: "user_id" });
      }, 800);
      return next;
    });
  }, [user]);

  return { prefs, savePrefs, loaded };
}
