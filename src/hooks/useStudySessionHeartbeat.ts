import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// iPadOS: Replace setInterval heartbeat with silent push via APNs

interface HeartbeatConfig {
  sessionId: string | null;
  timerMinutes?: number | null;
  cameraRef?: React.MutableRefObject<{ x: number; y: number; scale: number; rotation: number }>;
}

export function useStudySessionHeartbeat({ sessionId, timerMinutes, cameraRef }: HeartbeatConfig) {
  const startTimeRef = useRef<number>(Date.now());

  // Reset start time when session changes
  useEffect(() => {
    if (sessionId) startTimeRef.current = Date.now();
  }, [sessionId]);

  const doUpsert = useCallback(
    async (status: "active" | "paused" | "complete") => {
      if (!sessionId) return;
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const cam = cameraRef?.current ?? { x: 0, y: 0, scale: 1, rotation: 0 };

      const payload: Record<string, unknown> = {
        camera_x: cam.x,
        camera_y: cam.y,
        camera_scale: cam.scale,
        camera_rotation: cam.rotation,
        elapsed_seconds: elapsed,
        last_active_at: new Date().toISOString(),
        status,
      };

      if (status === "complete") {
        payload.completed_at = new Date().toISOString();
      }

      await supabase
        .from("study_sessions")
        .update(payload)
        .eq("id", sessionId);
    },
    [sessionId, cameraRef],
  );

  // 30-second heartbeat
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const targetSeconds = (timerMinutes ?? 0) * 60;
      if (timerMinutes && elapsed >= targetSeconds) {
        doUpsert("complete");
      } else {
        doUpsert("active");
      }
    }, 30_000);

    return () => {
      clearInterval(interval);
      // Final upsert on unmount
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const targetSeconds = (timerMinutes ?? 0) * 60;
      if (timerMinutes && elapsed >= targetSeconds) {
        doUpsert("complete");
      } else {
        doUpsert("paused");
      }
    };
  }, [sessionId, timerMinutes, doUpsert]);

  return { doUpsert };
}
