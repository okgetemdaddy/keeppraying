import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trashItem } from "@/hooks/useTrashBin";
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

/** A single verse item for cross-book bunch creation */
export interface CrossBunchItem {
  versionId: number;
  bookUsfm: string;
  chapterNumber: number;
  verseNumber: number;
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

  /* ── BOOKMARK: Toggle (add / remove / change color) ── */
  const toggleBookmark = useMutation({
    mutationFn: async (params: { verseNumber: number; color: string; existingId?: string }) => {
      if (!user || !ref) throw new Error("Not authenticated");

      // Remove existing bookmark if present
      if (params.existingId) {
        const { error } = await supabase
          .from("user_bookmarks")
          .delete()
          .eq("id", params.existingId);
        if (error) throw error;

        // Check if existing bookmark has same color → pure remove
        // We check via the cache to avoid an extra query
        const cached = qc.getQueryData<BibleChapterData>(key);
        const existing = cached?.bookmarks.find((b) => b.id === params.existingId);
        if (existing?.color === params.color) {
          return { action: "removed" as const };
        }

        // Different color → re-add with new color
        const { data, error: insertErr } = await supabase
          .from("user_bookmarks")
          .insert({
            user_id: user.id,
            version_id: ref.versionId,
            book_usfm: ref.bookUsfm,
            chapter_number: ref.chapterNumber,
            verse_number: params.verseNumber,
            color: params.color,
          } as any)
          .select("id, verse_number, color, created_at")
          .single();
        if (insertErr) throw insertErr;
        return { action: "replaced" as const, data };
      }

      // Fresh bookmark
      const { data, error } = await supabase
        .from("user_bookmarks")
        .insert({
          user_id: user.id,
          version_id: ref.versionId,
          book_usfm: ref.bookUsfm,
          chapter_number: ref.chapterNumber,
          verse_number: params.verseNumber,
          color: params.color,
        } as any)
        .select("id, verse_number, color, created_at")
        .single();
      if (error) throw error;
      return { action: "added" as const, data };
    },
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);

      if (params.existingId) {
        const existing = prev?.bookmarks.find((b) => b.id === params.existingId);
        if (existing?.color === params.color) {
          // Same color → removing
          updateChapterCache(qc, key, (old) => ({
            ...old,
            bookmarks: old.bookmarks.filter((b) => b.id !== params.existingId),
          }));
        } else {
          // Different color → replace optimistically
          const optimistic: UserBookmark = {
            id: `temp-${Date.now()}`,
            verse_number: params.verseNumber,
            color: params.color,
            created_at: new Date().toISOString(),
          };
          updateChapterCache(qc, key, (old) => ({
            ...old,
            bookmarks: [...old.bookmarks.filter((b) => b.id !== params.existingId), optimistic],
          }));
        }
      } else {
        const optimistic: UserBookmark = {
          id: `temp-${Date.now()}`,
          verse_number: params.verseNumber,
          color: params.color,
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

  /* ── VERSE BUNCH: Create bunch + add items (cross-book) ── */
  const createBunch = useMutation({
    mutationFn: async (params: {
      bunchName: string;
      items: CrossBunchItem[];
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
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

      // Add items — each with its own book/chapter/version
      const rows = params.items.map((item) => ({
        bunch_id: bunch.id,
        user_id: user.id,
        version_id: item.versionId,
        book_usfm: item.bookUsfm,
        chapter_number: item.chapterNumber,
        verse_number: item.verseNumber,
      }));
      const { error: itemsErr } = await supabase
        .from("verse_bunch_items")
        .insert(rows as any);
      if (itemsErr) throw itemsErr;

      return { bunchId: bunch.id, bunchName: bunch.bunch_name };
    },
    onMutate: async (params) => {
      if (!ref) return {};
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BibleChapterData>(key);
      const tempBunchId = `temp-bunch-${Date.now()}`;
      // Optimistically add items that belong to current chapter
      const currentChapterItems = params.items.filter(
        (item) =>
          item.bookUsfm === ref.bookUsfm &&
          item.chapterNumber === ref.chapterNumber &&
          item.versionId === ref.versionId,
      );
      if (currentChapterItems.length > 0) {
        const newItems: VerseBunchItemWithName[] = currentChapterItems.map((item) => ({
          id: `temp-item-${item.verseNumber}-${Date.now()}`,
          bunch_id: tempBunchId,
          bunch_name: params.bunchName,
          verse_number: item.verseNumber,
        }));
        updateChapterCache(qc, key, (old) => ({
          ...old,
          bunchItems: [...old.bunchItems, ...newItems],
        }));
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success("Verse Bunch created 📦");
      // Invalidate bunches list
      qc.invalidateQueries({ queryKey: ["verse_bunches"] });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Failed to create Verse Bunch");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  /* ── VERSE BUNCH: Add items to existing bunch ── */
  const addToBunch = useMutation({
    mutationFn: async (params: {
      bunchId: string;
      bunchName: string;
      items: CrossBunchItem[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const rows = params.items.map((item) => ({
        bunch_id: params.bunchId,
        user_id: user.id,
        version_id: item.versionId,
        book_usfm: item.bookUsfm,
        chapter_number: item.chapterNumber,
        verse_number: item.verseNumber,
      }));
      const { error } = await supabase
        .from("verse_bunch_items")
        .insert(rows as any);
      if (error) throw error;
      return { bunchId: params.bunchId, bunchName: params.bunchName };
    },
    onSuccess: (result) => {
      toast.success(`Added to "${result.bunchName}" 📦`);
      // Invalidate all verse_bunches queries to refresh items lists
      qc.invalidateQueries({ queryKey: ["verse_bunches"] });
    },
    onError: () => {
      toast.error("Failed to add verses to bunch");
    },
    onSettled: () => {
      if (key.length) qc.invalidateQueries({ queryKey: key });
      // Always re-fetch bunches to ensure verse lists are current
      qc.invalidateQueries({ queryKey: ["verse_bunches"] });
    },
  });

  /* ── VERSE BUNCH: Delete bunch ── */
  const deleteBunch = useMutation({
    mutationFn: async (bunchId: string) => {
      const { error } = await supabase
        .from("verse_bunches")
        .delete()
        .eq("id", bunchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Verse Bunch deleted");
      qc.invalidateQueries({ queryKey: ["verse_bunches"] });
    },
    onError: () => {
      toast.error("Failed to delete Verse Bunch");
    },
    onSettled: () => {
      if (key.length) qc.invalidateQueries({ queryKey: key });
    },
  });

  return {
    addHighlight,
    removeHighlight,
    toggleBookmark,
    saveNote,
    deleteNote,
    createBunch,
    addToBunch,
    deleteBunch,
  };
}
