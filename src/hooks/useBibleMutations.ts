import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  UserHighlight,
  UserNote,
  UserBookmark,
  VerseBunchItemWithName,
  BibleChapterData,
} from "@/hooks/useBibleChapterData";

/* ── Scripture context for mutations ── */
export interface ScriptureRef {
  versionId: number;
  bookUsfm: string;
  chapterNumber: number;
}

/* ── Query key builder ── */
function chapterKey(ref: ScriptureRef, userId: string) {
  return [
    "bible",
    "chapterData",
    ref.versionId,
    ref.bookUsfm,
    String(ref.chapterNumber),
    userId,
  ];
}

/* ── Optimistic cache updater helper ── */
function updateChapterCache(
  qc: ReturnType<typeof useQueryClient>,
  key: unknown[],
  updater: (prev: BibleChapterData) => BibleChapterData,
) {
  qc.setQueryData<BibleChapterData>(key, (old) => {
    if (!old) return old;
    return updater(old);
  });
}

/* ═══════════════════════════════════════
   Hook: useBibleMutations
   ═══════════════════════════════════════ */

export function useBibleMutations(ref: ScriptureRef | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const key = ref && user ? chapterKey(ref, user.id) : [];

  /* ── HIGHLIGHT: Add ── */
  const addHighlight = useMutation({
    mutationFn: async (params: {
      verseNumber: number;
      color: string;
      start?: number;
      end?: number;
    }) => {
      if (!user || !ref) throw new Error("Not authenticated");
      const row = {
        user_id: user.id,
        version_id: ref.versionId,
        book_usfm: ref.bookUsfm,
        chapter_number: ref.chapterNumber,
        verse_number: params.verseNumber,
        color: params.color,
        reference_normalized: {
          ...(params.start !== undefined ? { start: params.start } : {}),
          ...(params.end !== undefined ? { end: params.end } : {}),
        },
      };
      const { data, error } = await supabase
        .from("user_highlights")
        .insert(row as any)
        .select("id, verse_number, color, reference_normalized, created_at")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      const optimistic: UserHighlight = {
        id: `temp-${Date.now()}`,
        verse_number: params.verseNumber,
        color: params.color,
        reference_normalized: {
          ...(params.start !== undefined ? { start: params.start } : {}),
          ...(params.end !== undefined ? { end: params.end } : {}),
        },
        created_at: new Date().toISOString(),
      };
      updateChapterCache(qc, key, (old) => ({
        ...old,
        highlights: [...old.highlights, optimistic],
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to save highlight");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── HIGHLIGHT: Remove ── */
  const removeHighlight = useMutation({
    mutationFn: async (highlightId: string) => {
      const { error } = await supabase
        .from("user_highlights")
        .delete()
        .eq("id", highlightId);
      if (error) throw error;
    },
    onMutate: async (highlightId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      updateChapterCache(qc, key, (old) => ({
        ...old,
        highlights: old.highlights.filter((h) => h.id !== highlightId),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to remove highlight");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── BOOKMARK: Toggle ── */
  const toggleBookmark = useMutation({
    mutationFn: async (params: { verseNumber: number; existingId?: string }) => {
      if (!user || !ref) throw new Error("Not authenticated");
      if (params.existingId) {
        const { error } = await supabase
          .from("user_bookmarks")
          .delete()
          .eq("id", params.existingId);
        if (error) throw error;
        return { action: "removed" as const };
      }
      const { data, error } = await supabase
        .from("user_bookmarks")
        .insert({
          user_id: user.id,
          version_id: ref.versionId,
          book_usfm: ref.bookUsfm,
          chapter_number: ref.chapterNumber,
          verse_number: params.verseNumber,
        } as any)
        .select("id, verse_number, created_at")
        .single();
      if (error) throw error;
      return { action: "added" as const, data };
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      if (params.existingId) {
        updateChapterCache(qc, key, (old) => ({
          ...old,
          bookmarks: old.bookmarks.filter((b) => b.id !== params.existingId),
        }));
      } else {
        const optimistic: UserBookmark = {
          id: `temp-${Date.now()}`,
          verse_number: params.verseNumber,
          created_at: new Date().toISOString(),
        };
        updateChapterCache(qc, key, (old) => ({
          ...old,
          bookmarks: [...old.bookmarks, optimistic],
        }));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to update bookmark");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── NOTE: Save (upsert) ── */
  const saveNote = useMutation({
    mutationFn: async (params: {
      verseNumber: number;
      content: string;
      existingId?: string;
    }) => {
      if (!user || !ref) throw new Error("Not authenticated");
      if (params.existingId) {
        const { data, error } = await supabase
          .from("user_notes")
          .update({ note_content: params.content } as any)
          .eq("id", params.existingId)
          .select("id, verse_number, note_content, created_at, updated_at")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("user_notes")
        .insert({
          user_id: user.id,
          version_id: ref.versionId,
          book_usfm: ref.bookUsfm,
          chapter_number: ref.chapterNumber,
          verse_number: params.verseNumber,
          note_content: params.content,
        } as any)
        .select("id, verse_number, note_content, created_at, updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      const now = new Date().toISOString();
      if (params.existingId) {
        updateChapterCache(qc, key, (old) => ({
          ...old,
          notes: old.notes.map((n) =>
            n.id === params.existingId
              ? { ...n, note_content: params.content, updated_at: now }
              : n,
          ),
        }));
      } else {
        const optimistic: UserNote = {
          id: `temp-${Date.now()}`,
          verse_number: params.verseNumber,
          note_content: params.content,
          created_at: now,
          updated_at: now,
        };
        updateChapterCache(qc, key, (old) => ({
          ...old,
          notes: [...old.notes, optimistic],
        }));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to save note");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── NOTE: Delete ── */
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("user_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onMutate: async (noteId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      updateChapterCache(qc, key, (old) => ({
        ...old,
        notes: old.notes.filter((n) => n.id !== noteId),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to delete note");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── VERSE BUNCH: Create bunch + add items ── */
  const createBunch = useMutation({
    mutationFn: async (params: {
      bunchName: string;
      verseNumbers: number[];
      description?: string;
    }) => {
      if (!user || !ref) throw new Error("Not authenticated");
      // Create the bunch container
      const { data: bunch, error: bunchErr } = await supabase
        .from("verse_bunches")
        .insert({
          user_id: user.id,
          bunch_name: params.bunchName,
          description: params.description ?? null,
        } as any)
        .select("id, bunch_name")
        .single();
      if (bunchErr) throw bunchErr;

      // Add items
      const items = params.verseNumbers.map((vn) => ({
        bunch_id: bunch.id,
        user_id: user.id,
        version_id: ref.versionId,
        book_usfm: ref.bookUsfm,
        chapter_number: ref.chapterNumber,
        verse_number: vn,
      }));
      const { error: itemsErr } = await supabase
        .from("verse_bunch_items")
        .insert(items as any);
      if (itemsErr) throw itemsErr;

      return { bunchId: bunch.id, bunchName: bunch.bunch_name };
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      const tempBunchId = `temp-bunch-${Date.now()}`;
      const newItems: VerseBunchItemWithName[] = params.verseNumbers.map((vn) => ({
        id: `temp-item-${vn}-${Date.now()}`,
        bunch_id: tempBunchId,
        bunch_name: params.bunchName,
        verse_number: vn,
      }));
      updateChapterCache(qc, key, (old) => ({
        ...old,
        bunchItems: [...old.bunchItems, ...newItems],
      }));
      return { prev };
    },
    onSuccess: () => {
      toast.success("Verse Bunch created 📦");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to create Verse Bunch");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    addHighlight,
    removeHighlight,
    toggleBookmark,
    saveNote,
    deleteNote,
    createBunch,
  };
}
