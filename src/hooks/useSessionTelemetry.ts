// iPadOS: Replace Supabase batch insert with CoreData NSBatchInsertRequest + silent push sync
// iPadOS: Tab close maps to sceneDidEnterBackground — use BGAppRefreshTask to flush CoreData to Supabase
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SessionEventType =
  | "verse_view"
  | "highlight_added"
  | "highlight_removed"
  | "note_written"
  | "note_edited"
  | "ink_stroke"
  | "ink_erased"
  | "circle_select"
  | "cross_ref_nav"
  | "chapter_nav"
  | "bookmark_added"
  | "bookmark_removed"
  | "session_start"
  | "session_end";

export interface SessionEvent {
  id: string;
  session_id: string;
  user_id: string;
  event_type: SessionEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

interface BufferedEvent {
  session_id: string;
  user_id: string;
  event_type: SessionEventType;
  payload: Record<string, unknown>;
}

const BUFFER_SIZE = 5;
const FLUSH_INTERVAL_MS = 10_000;
const VERSE_VIEW_DEBOUNCE_MS = 2_000;

export function useSessionTelemetry(sessionId: string | null) {
  const { user } = useAuth();
  const bufferRef = useRef<BufferedEvent[]>([]);
  const eventCountRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verseViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVerseViewRef = useRef<string | null>(null);

  const flush = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    const batch = [...bufferRef.current];
    bufferRef.current = [];

    try {
      await supabase.from("session_events").insert(batch as any);
    } catch {
      // Re-add on failure for retry
      bufferRef.current.unshift(...batch);
    }
  }, []);

  // Periodic flush
  useEffect(() => {
    if (!sessionId) return;
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      // Flush remaining on unmount
      flush();
    };
  }, [sessionId, flush]);

  const logEvent = useCallback(
    (eventType: SessionEventType, payload: Record<string, unknown> = {}) => {
      if (!sessionId || !user?.id) return;

      // Debounce verse_view events
      if (eventType === "verse_view") {
        const key = `${payload.verse_number ?? ""}`;
        if (key === lastVerseViewRef.current) return;
        if (verseViewTimerRef.current) clearTimeout(verseViewTimerRef.current);
        verseViewTimerRef.current = setTimeout(() => {
          lastVerseViewRef.current = key;
          bufferRef.current.push({
            session_id: sessionId,
            user_id: user.id,
            event_type: eventType,
            payload,
          });
          eventCountRef.current++;
          if (bufferRef.current.length >= BUFFER_SIZE) flush();
        }, VERSE_VIEW_DEBOUNCE_MS);
        return;
      }

      // Truncate payloads for specific events
      let sanitizedPayload = { ...payload };
      if (eventType === "ink_stroke") {
        sanitizedPayload = {
          annotation_key: payload.annotation_key,
          stroke_count: payload.stroke_count,
        };
      } else if (eventType === "highlight_added") {
        sanitizedPayload = {
          verse_number: payload.verse_number,
          color: payload.color,
          text_snippet: typeof payload.text_snippet === "string"
            ? payload.text_snippet.slice(0, 60)
            : undefined,
        };
      } else if (eventType === "note_written" || eventType === "note_edited") {
        sanitizedPayload = {
          verse_number: payload.verse_number,
          note_snippet: typeof payload.note_snippet === "string"
            ? payload.note_snippet.slice(0, 100)
            : undefined,
        };
      }

      bufferRef.current.push({
        session_id: sessionId,
        user_id: user.id,
        event_type: eventType,
        payload: sanitizedPayload,
      });
      eventCountRef.current++;

      if (bufferRef.current.length >= BUFFER_SIZE) flush();
    },
    [sessionId, user?.id, flush],
  );

  const getEventCount = useCallback(() => eventCountRef.current, []);

  // Reset count when session changes
  useEffect(() => {
    eventCountRef.current = 0;
    bufferRef.current = [];
    lastVerseViewRef.current = null;
  }, [sessionId]);

  return { logEvent, getEventCount };
}
