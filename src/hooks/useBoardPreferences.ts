import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getLocalCache, setLocalCache, cacheKeys } from "@/lib/localCache";

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
  calendar_bg: string;
  calendar_text: string;
  calendar_accent: string;
  atmosphere_id: string;
  caption_mode_tts: boolean;
  caption_mode_recorded: boolean;
  default_card_layout: string;
  tts_voice_id: string;
  show_add_prayer_fab: boolean;
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
  calendar_bg: "#F5F0E8",
  calendar_text: "#2C2418",
  calendar_accent: "#B85C38",
  atmosphere_id: "warm-parchment",
  caption_mode_tts: true,
  caption_mode_recorded: true,
  default_card_layout: "standard",
  tts_voice_id: "sal",
};

export function useBoardPreferences() {
  const { user } = useAuth();
  // Stale-while-revalidate: show cached prefs instantly
  const cached = user ? getLocalCache<BoardPrefs>(cacheKeys.boardPrefs(user.id)) : null;
  const [prefs, setPrefs] = useState<BoardPrefs>(cached ?? DEFAULTS);
  const [loaded, setLoaded] = useState(!!cached);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    supabase
      .from("board_preferences")
      .select("theme,animations_enabled,sound_id,sound_volume,theme_preset,theme_bg,theme_text,theme_accent,theme_scope,calendar_bg,calendar_text,calendar_accent,atmosphere_id,caption_mode_tts,caption_mode_recorded,default_card_layout,tts_voice_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const fresh: BoardPrefs = {
            theme: data.theme ?? DEFAULTS.theme,
            animations_enabled: data.animations_enabled ?? DEFAULTS.animations_enabled,
            sound_id: data.sound_id ?? null,
            sound_volume: data.sound_volume ?? DEFAULTS.sound_volume,
            theme_preset: (data as any).theme_preset ?? DEFAULTS.theme_preset,
            theme_bg: (data as any).theme_bg ?? null,
            theme_text: (data as any).theme_text ?? null,
            theme_accent: (data as any).theme_accent ?? null,
            theme_scope: (data as any).theme_scope ?? DEFAULTS.theme_scope,
            calendar_bg: (data as any).calendar_bg ?? DEFAULTS.calendar_bg,
            calendar_text: (data as any).calendar_text ?? DEFAULTS.calendar_text,
            calendar_accent: (data as any).calendar_accent ?? DEFAULTS.calendar_accent,
            atmosphere_id: (data as any).atmosphere_id ?? DEFAULTS.atmosphere_id,
            caption_mode_tts: (data as any).caption_mode_tts ?? DEFAULTS.caption_mode_tts,
            caption_mode_recorded: (data as any).caption_mode_recorded ?? DEFAULTS.caption_mode_recorded,
            default_card_layout: (data as any).default_card_layout ?? DEFAULTS.default_card_layout,
            tts_voice_id: (data as any).tts_voice_id ?? DEFAULTS.tts_voice_id,
          };
          setPrefs(fresh);
          setLocalCache(cacheKeys.boardPrefs(user!.id), fresh);
        }
        setLoaded(true);
      });
  }, [user]);

  const savePrefs = useCallback((updates: Partial<BoardPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      if (!user) return next;
      // Write-through to local cache immediately
      setLocalCache(cacheKeys.boardPrefs(user.id), next);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await supabase
          .from("board_preferences")
          .upsert({ user_id: user.id, ...next } as any, { onConflict: "user_id" })
          .select();
      }, 800);
      return next;
    });
  }, [user]);

  return { prefs, savePrefs, loaded };
}
