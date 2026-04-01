import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ── Item type → source table mapping ── */
const TABLE_MAP: Record<string, string> = {
  highlight: "user_highlights",
  bookmark: "user_bookmarks",
  note: "user_notes",
  verse_bunch: "verse_bunches",
  prayer: "prayer_cards",
  saved_prayer: "user_saved_prayers",
  testimony: "testimonies",
  like: "likes",
  prayed_action: "prayed_actions",
  testimony_praise: "testimony_praises",
  comment: "comments",
  breath_collection: "breath_collections",
  family_homework: "family_homework",
  circle_homework: "circle_homework",
};

/* ── Item type → display labels ── */
export const ITEM_TYPE_LABELS: Record<string, string> = {
  highlight: "Highlight",
  bookmark: "Bookmark",
  note: "Note",
  verse_bunch: "Verse Bunch",
  prayer: "Prayer",
  saved_prayer: "Saved Prayer",
  testimony: "Testimony",
  like: "Like",
  prayed_action: "Prayed Action",
  testimony_praise: "Praise",
  comment: "Comment",
  breath_collection: "Breath Collection",
  family_homework: "Family Homework",
  circle_homework: "Circle Homework",
};

/* ── Category groupings ── */
const BIBLE_TYPES = ["highlight", "bookmark", "note", "verse_bunch"];
const BOARD_TYPES = ["prayer", "saved_prayer", "testimony", "like", "prayed_action", "testimony_praise", "comment", "breath_collection", "family_homework", "circle_homework"];

export type TrashContext = "bible" | "board" | "all";

export interface TrashItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  item_snapshot: Record<string, unknown>;
  deleted_at: string;
  expires_at: string;
}

/* ── Trash an item (snapshot + delete original) ── */
export async function trashItem(
  userId: string,
  itemType: string,
  itemId: string,
  snapshot: Record<string, unknown>,
) {
  const { error } = await supabase.from("trash_bin" as any).insert({
    user_id: userId,
    item_type: itemType,
    item_id: itemId,
    item_snapshot: snapshot,
  } as any);
  if (error) console.error("Trash snapshot failed:", error);
}

/* ── Restore helper: re-insert into the original table ── */
async function restoreToTable(itemType: string, snapshot: Record<string, unknown>) {
  const table = TABLE_MAP[itemType];
  if (!table) throw new Error(`Unknown item type: ${itemType}`);

  // Remove fields that might conflict on re-insert
  const cleaned = { ...snapshot };

  const { error } = await supabase.from(table as any).insert(cleaned as any);
  if (error) throw error;
}

/* ── Hook ── */
export function useTrashBin(context: TrashContext = "all") {
  const { user } = useAuth();
  const qc = useQueryClient();

  const typeFilter = context === "bible" ? BIBLE_TYPES : context === "board" ? BOARD_TYPES : [...BIBLE_TYPES, ...BOARD_TYPES];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trash_bin", user?.id, context],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trash_bin" as any)
        .select("*")
        .eq("user_id", user!.id)
        .gte("expires_at", new Date().toISOString())
        .in("item_type", typeFilter)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TrashItem[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trash_bin"] });

  const restoreItem = useMutation({
    mutationFn: async (trashId: string) => {
      const item = items.find((i) => i.id === trashId);
      if (!item) throw new Error("Item not found in trash");
      await restoreToTable(item.item_type, item.item_snapshot);
      const { error } = await supabase.from("trash_bin" as any).delete().eq("id", trashId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Restored successfully");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error("Restore failed: " + err.message);
    },
  });

  const permanentDelete = useMutation({
    mutationFn: async (trashId: string) => {
      const { error } = await supabase.from("trash_bin" as any).delete().eq("id", trashId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permanently deleted");
      invalidate();
    },
    onError: () => toast.error("Delete failed"),
  });

  const bulkRestore = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await restoreToTable(item.item_type, item.item_snapshot);
          await supabase.from("trash_bin" as any).delete().eq("id", id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Items restored");
      invalidate();
    },
    onError: () => toast.error("Bulk restore failed"),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("trash_bin" as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Items permanently deleted");
      invalidate();
    },
    onError: () => toast.error("Bulk delete failed"),
  });

  const emptyTrash = useMutation({
    mutationFn: async () => {
      const ids = items.map((i) => i.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("trash_bin" as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trash emptied");
      invalidate();
    },
    onError: () => toast.error("Failed to empty trash"),
  });

  /* Group items by type */
  const grouped = items.reduce<Record<string, TrashItem[]>>((acc, item) => {
    const key = item.item_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return {
    items,
    grouped,
    isLoading,
    restoreItem,
    permanentDelete,
    bulkRestore,
    bulkDelete,
    emptyTrash,
    invalidate,
  };
}
