import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LS_COMPLETED = "sermon-app-completed-v2";
const LS_NOTIF = "sermon-prayer-notif-times";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useSermonProgress() {
  const { user } = useAuth();
  const [completedPoints, setCompletedPoints] = useState<Record<string, boolean>>(
    () => readLS(LS_COMPLETED, {})
  );
  const [notifTimes, setNotifTimesState] = useState<Record<string, string>>(
    () => readLS(LS_NOTIF, {})
  );
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB on mount
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    (async () => {
      const { data } = await supabase
        .from("user_sermon_progress")
        .select("completed_points, notif_times")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const dbCompleted = (data.completed_points as Record<string, boolean>) || {};
        const dbNotif = (data.notif_times as Record<string, string>) || {};
        // Merge: cloud wins, then local fills gaps
        const mergedCompleted = { ...readLS(LS_COMPLETED, {}), ...dbCompleted };
        const mergedNotif = { ...readLS(LS_NOTIF, {}), ...dbNotif };
        setCompletedPoints(mergedCompleted);
        setNotifTimesState(mergedNotif);
        localStorage.setItem(LS_COMPLETED, JSON.stringify(mergedCompleted));
        localStorage.setItem(LS_NOTIF, JSON.stringify(mergedNotif));
      }
      setLoaded(true);
    })();
  }, [user]);

  const persistToDb = useCallback(
    (cp: Record<string, boolean>, nt: Record<string, string>) => {
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await supabase.from("user_sermon_progress").upsert(
          {
            user_id: user.id,
            completed_points: cp as any,
            notif_times: nt as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }, 800);
    },
    [user]
  );

  const markPointCompleted = useCallback(
    (cardId: string, idx: number) => {
      const key = `${cardId}:${idx}`;
      setCompletedPoints((prev) => {
        const next = { ...prev, [key]: true };
        localStorage.setItem(LS_COMPLETED, JSON.stringify(next));
        persistToDb(next, notifTimes);
        return next;
      });
    },
    [persistToDb, notifTimes]
  );

  const isPointCompleted = useCallback(
    (cardId: string, idx: number) => !!completedPoints[`${cardId}:${idx}`],
    [completedPoints]
  );

  const setNotifTime = useCallback(
    (day: string, time: string) => {
      setNotifTimesState((prev) => {
        const next = { ...prev, [day]: time };
        localStorage.setItem(LS_NOTIF, JSON.stringify(next));
        persistToDb(completedPoints, next);
        return next;
      });
    },
    [persistToDb, completedPoints]
  );

  const getNotifTime = useCallback(
    (day: string) => notifTimes[day] || "Morning",
    [notifTimes]
  );

  return {
    completedPoints,
    notifTimes,
    loaded,
    markPointCompleted,
    isPointCompleted,
    setNotifTime,
    getNotifTime,
  };
}
