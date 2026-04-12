/**
 * Theme provider for the mockup design system.
 * Manages dark/light mode via data-theme attribute on <html>.
 * Persists to localStorage and async-syncs to profiles.ui_theme.
 */

const STORAGE_KEY = "kp-theme";
type Theme = "dark" | "light";

/** Call before React mounts to prevent flash */
export function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const theme: Theme = stored === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
}

/** Returns the current theme */
export function getTheme(): Theme {
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
}

/** Toggle between dark and light, persist locally */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEY, next);
  // Async sync to Supabase (fire-and-forget)
  syncThemeToProfile(next);
  return next;
}

/** Set a specific theme */
export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  syncThemeToProfile(theme);
}

async function syncThemeToProfile(theme: Theme): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("board_preferences")
      .upsert({ user_id: user.id, theme, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    // Silent fail — localStorage is the source of truth for instant load
  }
}
