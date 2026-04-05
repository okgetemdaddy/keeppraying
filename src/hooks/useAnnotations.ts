import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StrokeData } from "@/components/bible/HandwritingEngine";

/**
 * @native-port — INTERNAL ENGINEERING NOTES (not user-facing)
 * ─────────────────────────────────────────────────────────
 *
 * NATIVE INK SERIALIZATION & BIDIRECTIONAL SYNC
 *
 * When the Capacitor PencilKitBridge is active, native strokes are
 * serialized via PKDrawing.dataRepresentation() → base64 and stored
 * alongside the existing web stroke JSON in the `strokes` column.
 *
 * Schema consideration: add an optional `native_drawing_base64` text
 * column to the annotations table for the raw PKDrawing data.
 *
 * BIDIRECTIONAL RENDERING:
 *   - Web platforms: render from `strokes` JSON → SVG <path> elements
 *   - Native iPadOS: render from `native_drawing_base64` → PKCanvasView
 *   - Edits on either platform serialize back to both formats
 *
 * CAPACITOR LISTENER PATTERN:
 *
 *   import { Plugins } from '@capacitor/core';
 *   const { PencilKitBridge } = Plugins;
 *
 *   PencilKitBridge.addListener('onNativeInkUpdated', (event) => {
 *     const { drawingBase64 } = event;
 *     saveAnnotation.mutate({
 *       verseIds,
 *       strokes: currentWebStrokes,
 *       nativeDrawingBase64: drawingBase64,
 *       existingId: annotationId,
 *     });
 *   });
 *
 * The exportForPencilKit() method already captures pressure, tilt, and
 * azimuth — these map 1:1 to PKStrokePoint properties for lossless
 * round-tripping between web and native ink engines.
 */

export interface Annotation {
  id: string;
  user_id: string;
  verse_ids: string[];
  strokes: StrokeData[];
  svg: string | null;
  typed_text: string | null;
  tags: string[] | null;
  folder: string | null;
  created_at: string;
  updated_at: string;
}

export function useVerseAnnotations(verseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["annotations", verseId, user?.id],
    enabled: !!verseId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("annotations")
        .select("*")
        .contains("verse_ids", [verseId])
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Annotation[];
    },
  });
}

export function useChapterAnnotations(bookUsfm?: string, chapterNumber?: string) {
  const { user } = useAuth();
  const prefix = bookUsfm && chapterNumber ? `${bookUsfm}.${chapterNumber}.` : null;

  return useQuery({
    queryKey: ["annotations-chapter", prefix, user?.id],
    enabled: !!prefix && !!user?.id,
    queryFn: async () => {
      // Fetch all annotations for this user, then filter client-side by verse prefix
      const { data, error } = await (supabase as any)
        .from("annotations")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      const all = (data ?? []) as Annotation[];
      return all.filter((a) =>
        a.verse_ids.some((vid) => vid.startsWith(prefix!))
      );
    },
  });
}

export function useJournalAnnotations(bookUsfm?: string, chapterNumber?: string) {
  const { user } = useAuth();
  const journalKey = bookUsfm && chapterNumber ? `${bookUsfm}.${chapterNumber}.journal` : null;

  return useQuery({
    queryKey: ["annotations-journal", journalKey, user?.id],
    enabled: !!journalKey && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("annotations")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      const all = (data ?? []) as Annotation[];
      return all.filter((a) =>
        a.verse_ids.some((vid) => vid.endsWith(".journal"))
          && a.verse_ids.some((vid) => vid === journalKey)
      );
    },
  });
}

export function useChapterInkAnnotations(bookUsfm?: string, chapterNumber?: string) {
  const { user } = useAuth();
  const inkKey = bookUsfm && chapterNumber ? `${bookUsfm}.${chapterNumber}.ink` : null;

  return useQuery({
    queryKey: ["annotations-ink", inkKey, user?.id],
    enabled: !!inkKey && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("annotations")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      const all = (data ?? []) as Annotation[];
      return all.find((a) => a.verse_ids.includes(inkKey!)) ?? null;
    },
  });
}

export function useAnnotationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveAnnotation = useMutation({
    mutationFn: async ({
      verseIds,
      strokes,
      svg,
      typedText,
      existingId,
    }: {
      verseIds: string[];
      strokes: StrokeData[];
      svg?: string;
      typedText?: string;
      existingId?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (existingId) {
        const { error } = await (supabase as any)
          .from("annotations")
          .update({ strokes, svg, typed_text: typedText ?? null, updated_at: new Date().toISOString() })
          .eq("id", existingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("annotations")
          .insert({
            user_id: user.id,
            verse_ids: verseIds,
            strokes,
            svg: svg ?? null,
            typed_text: typedText ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-chapter"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-journal"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-ink"] });
    },
  });

  const deleteAnnotation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("annotations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-chapter"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-journal"] });
      queryClient.invalidateQueries({ queryKey: ["annotations-ink"] });
    },
  });

  return { saveAnnotation, deleteAnnotation };
}
