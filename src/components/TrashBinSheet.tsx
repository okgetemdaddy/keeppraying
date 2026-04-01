import { useState, useMemo } from "react";
import {
  ResponsiveSheet as Sheet,
  ResponsiveSheetContent as SheetContent,
  ResponsiveSheetHeader as SheetHeader,
  ResponsiveSheetTitle as SheetTitle,
  ResponsiveSheetDescription as SheetDescription,
} from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw, Trash2, ChevronDown, ChevronRight, AlertTriangle, Inbox,
} from "lucide-react";
import {
  useTrashBin,
  ITEM_TYPE_LABELS,
  type TrashContext,
  type TrashItem,
} from "@/hooks/useTrashBin";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";

interface TrashBinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: TrashContext;
}

/* ── Item preview helper ── */
function getItemPreview(item: TrashItem): string {
  const s = item.item_snapshot;
  if (s.title && typeof s.title === "string") return s.title;
  if (s.bunch_name && typeof s.bunch_name === "string") return s.bunch_name;
  if (s.name && typeof s.name === "string") return s.name;
  if (s.prayer_text && typeof s.prayer_text === "string") return s.prayer_text.slice(0, 60) + (s.prayer_text.length > 60 ? "…" : "");
  if (s.text && typeof s.text === "string") return s.text.slice(0, 60) + (s.text.length > 60 ? "…" : "");
  if (s.body && typeof s.body === "string") return s.body.slice(0, 60) + (s.body.length > 60 ? "…" : "");
  if (s.note_content && typeof s.note_content === "string") return s.note_content.slice(0, 60) + (s.note_content.length > 60 ? "…" : "");
  if (s.color && typeof s.color === "string" && s.verse_number) return `Verse ${s.verse_number} (${s.color})`;
  if (s.verse_number) return `Verse ${s.verse_number}`;
  if (s.prayer_id && typeof s.prayer_id === "string") return `Prayer interaction`;
  return item.item_type;
}

function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrashBinSheet({ open, onOpenChange, context }: TrashBinSheetProps) {
  const {
    items, grouped, isLoading,
    restoreItem, permanentDelete, bulkRestore, bulkDelete, emptyTrash,
  } = useTrashBin(context);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleBulkRestore = () => {
    bulkRestore.mutate(Array.from(selected));
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate(Array.from(selected));
    setSelected(new Set());
  };

  const sortedGroupKeys = useMemo(
    () => Object.keys(grouped).sort((a, b) => (ITEM_TYPE_LABELS[a] || a).localeCompare(ITEM_TYPE_LABELS[b] || b)),
    [grouped],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px] flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="font-display text-lg flex items-center gap-2">
                  <Trash2 className="w-4.5 h-4.5 text-muted-foreground" />
                  Trash Bin
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {items.length} item{items.length !== 1 ? "s" : ""} · auto-deletes after 30 days
                </SheetDescription>
              </div>
              {items.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setConfirmEmpty(true)}
                >
                  Empty Trash
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Your trash is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Nothing deleted in the last 30 days
                  </p>
                </div>
              ) : (
                <>
                  {/* Select all */}
                  {items.length > 1 && (
                    <button
                      onClick={selectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      {selected.size === items.length ? "Deselect all" : "Select all"}
                    </button>
                  )}

                  {sortedGroupKeys.map((type) => {
                    const groupItems = grouped[type];
                    const isCollapsed = collapsedGroups.has(type);
                    return (
                      <section key={type}>
                        <button
                          onClick={() => toggleGroup(type)}
                          className="flex items-center gap-2 w-full text-left mb-2"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {ITEM_TYPE_LABELS[type] || type}s
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {groupItems.length}
                          </Badge>
                        </button>
                        {!isCollapsed && (
                          <div className="space-y-1">
                            {groupItems.map((item) => {
                              const days = daysLeft(item.expires_at);
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors group"
                                >
                                  <Checkbox
                                    checked={selected.has(item.id)}
                                    onCheckedChange={() => toggleSelect(item.id)}
                                    className="shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">
                                      {getItemPreview(item)}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${
                                      days <= 5 ? "border-destructive/50 text-destructive" : ""
                                    }`}
                                  >
                                    {days}d
                                  </Badge>
                                  <button
                                    onClick={() => restoreItem.mutate(item.id)}
                                    className="p-1 rounded hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Restore"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => permanentDelete.mutate(item.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="border-t border-border px-5 py-3 flex items-center gap-2 bg-card">
              <span className="text-xs text-muted-foreground flex-1">
                {selected.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1"
                onClick={handleBulkRestore}
                disabled={bulkRestore.isPending}
              >
                <RotateCcw className="w-3 h-3" /> Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-7 gap-1"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
              >
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Empty Trash Confirmation */}
      <Dialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Empty Trash?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {items.length} item{items.length !== 1 ? "s" : ""} in your trash. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEmpty(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                emptyTrash.mutate();
                setConfirmEmpty(false);
                setSelected(new Set());
              }}
              disabled={emptyTrash.isPending}
            >
              Delete All Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
