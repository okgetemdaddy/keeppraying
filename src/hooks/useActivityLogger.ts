import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ActivityType =
  | "page_view"
  | "login"
  | "logout"
  | "search"
  | "prayer_card_view"
  | "feature_use"
  | "button_click"
  | "session_start"
  | "session_end";

/**
 * Logs user activity to user_activity_log table.
 * Auto-tracks page views and session start/end.
 * Exposes `logActivity` for manual event logging.
 */
export function useActivityLogger() {
  const { user } = useAuth();
  const location = useLocation();
  const sessionStartRef = useRef<string | null>(null);
  const lastPageRef = useRef<string | null>(null);

  const logActivity = useCallback(
    async (
      type: ActivityType,
      data?: Record<string, unknown>,
      pagePath?: string
    ) => {
      if (!user) return;
      try {
        await (supabase.from("user_activity_log") as any).insert({
          user_id: user.id,
          activity_type: type,
          activity_data: data || {},
          page_path: pagePath || location.pathname,
        });
      } catch {
        // silent – activity logging should never break the app
      }
    },
    [user, location.pathname]
  );

  // Track page views on route change
  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    if (path === lastPageRef.current) return;
    lastPageRef.current = path;
    logActivity("page_view", { path, search: location.search });
  }, [location.pathname, location.search, user, logActivity]);

  // Track session start / end
  useEffect(() => {
    if (!user) return;
    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date().toISOString();
      logActivity("session_start");
    }

    const handleUnload = () => {
      if (!sessionStartRef.current) return;
      const durationMs =
        Date.now() - new Date(sessionStartRef.current).getTime();
      // Use sendBeacon for reliability on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_log`;
      const body = JSON.stringify({
        user_id: user.id,
        activity_type: "session_end",
        activity_data: { duration_ms: durationMs },
        page_path: location.pathname,
      });
      navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { logActivity };
}
