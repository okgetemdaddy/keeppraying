import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  BookMarked,
  BookOpen,
  StickyNote,
  Package,
  X,
  Check,
  Plus,
  Palette,
  Circle,
  Layers,
  PenTool,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResponsiveSheet as Sheet,
  ResponsiveSheetContent as SheetContent,
  ResponsiveSheetHeader as SheetHeader,
  ResponsiveSheetTitle as SheetTitle,
} from "@/components/ui/responsive-sheet";
import {
  DEFAULT_BOOKMARK_COLORS,
  getBookmarkColorDef,
  getNextExpansionColor,
  type BookmarkColorDef,
} from "@/components/bible/bookmarkColors";

/* ── Colour swatches ── */
const SWATCH_COLORS = [
  { key: "yellow", bg: "bg-yellow-400", ring: "ring-yellow-500" },
  { key: "green", bg: "bg-emerald-400", ring: "ring-emerald-500" },
  { key: "blue", bg: "bg-sky-400", ring: "ring-sky-500" },
  { key: "pink", bg: "bg-pink-400", ring: "ring-pink-500" },
  { key: "purple", bg: "bg-violet-400", ring: "ring-violet-500" },
  { key: "orange", bg: "bg-orange-400", ring: "ring-orange-500" },
];

export interface ToolbarPosition {
  x: number;
  y: number;
}

export interface FloatingToolbarProps {
  position: ToolbarPosition;
  selectedVerses: number[];
  isPartialSelection: boolean;
  partialSelectionVerse?: number;
  partialSelectionRange?: { start: number; end: number };
  isBookmarked: boolean;
  bookmarkId?: string;
  existingHighlightColor?: string;
  existingHighlightId?: string;
  onHighlight: (color: string, verseNumber: number, start?: number, end?: number) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onToggleBookmark: (verseNumber: number, color: string, existingId?: string) => void;
  onAddNote: (verseNumber: number) => void;
  onCreateBunch: () => void;
  onAddToBunch?: () => void;
  onCrossRef?: (verseNumber: number) => void;
  onReference?: (verseNumber: number, word?: string) => void;
  onDismiss: () => void;
  isAuthenticated: boolean;
  hasBunches?: boolean;
  /** All bookmark colors used by the user (for "+" auto-assign) */
  usedBookmarkColors?: Set<string>;
  /** Current bookmark on this verse, if any */
  existingBookmarkColor?: string;
}

/* ── Shared actions content (used in both desktop floating + mobile sheet) ── */
function ToolbarActions({
  selectedVerses,
  isPartialSelection,
  partialSelectionVerse,
  partialSelectionRange,
  isBookmarked,
  bookmarkId,
  existingHighlightColor,
  existingHighlightId,
  existingBookmarkColor,
  usedBookmarkColors,
  onHighlight,
  onRemoveHighlight,
  onToggleBookmark,
  onAddNote,
  onCreateBunch,
  onAddToBunch,
  onCrossRef,
  onReference,
  hasBunches,
  onDismiss,
  layout = "horizontal",
}: Omit<FloatingToolbarProps, "position" | "isAuthenticated"> & { layout?: "horizontal" | "vertical" }) {
  const primaryVerse =
    isPartialSelection && partialSelectionVerse
      ? partialSelectionVerse
      : selectedVerses[0];

  const isVertical = layout === "vertical";

  return (
    <div className={isVertical ? "space-y-4" : "flex items-center"}>
      {/* ── Highlight colour swatches ── */}
      <div className={isVertical ? "space-y-3" : "flex items-center gap-1"}>
        {isVertical && (
          <p className="text-xs font-medium text-muted-foreground mb-2">Highlight Color</p>
        )}
        <div className={`flex items-center ${isVertical ? "gap-3" : "gap-1"}`}>
          {SWATCH_COLORS.map((swatch) => {
            const isActiveColor = swatch.key === existingHighlightColor;
            return (
              <button
                key={swatch.key}
                className={`relative ${isVertical ? "h-9 w-9" : "h-6 w-6"} rounded-full ${swatch.bg} hover:ring-2 ${swatch.ring} ring-offset-1 ring-offset-card transition-all ${isActiveColor ? "ring-2 " + swatch.ring : ""}`}
                title={isActiveColor ? `Remove ${swatch.key} highlight` : `Highlight ${swatch.key}`}
                onClick={() => {
                  if (isActiveColor && existingHighlightId && onRemoveHighlight) {
                    onRemoveHighlight(existingHighlightId);
                    onDismiss();
                    return;
                  }
                  if (isPartialSelection && partialSelectionVerse && partialSelectionRange) {
                    onHighlight(
                      swatch.key,
                      partialSelectionVerse,
                      partialSelectionRange.start,
                      partialSelectionRange.end,
                    );
                  } else {
                    selectedVerses.forEach((vn) => onHighlight(swatch.key, vn));
                  }
                  onDismiss();
                }}
              >
                {isActiveColor && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <X className={`${isVertical ? "h-4 w-4" : "h-3.5 w-3.5"} text-white drop-shadow-sm`} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isVertical ? <div className="h-px bg-border" /> : <div className="mx-1 h-6 w-px bg-border" />}

      {/* ── Bookmark colour swatches ── */}
      {primaryVerse && (
        <div className={isVertical ? "space-y-3" : "flex items-center gap-1"}>
          {isVertical && (
            <p className="text-xs font-medium text-muted-foreground mb-2">Bookmark Color</p>
          )}
          <div className={`flex items-center ${isVertical ? "gap-3" : "gap-1"}`}>
            {DEFAULT_BOOKMARK_COLORS.map((bmc) => {
              const isActive = isBookmarked && existingBookmarkColor === bmc.key;
              return (
                <button
                  key={bmc.key}
                  className={`relative ${isVertical ? "h-9 w-9" : "h-6 w-6"} rounded-full ${bmc.dot} hover:ring-2 ${bmc.ring} ring-offset-1 ring-offset-card transition-all ${isActive ? "ring-2 " + bmc.ring : ""}`}
                  title={isActive ? `Remove ${bmc.label} bookmark` : `Bookmark ${bmc.label}`}
                  onClick={() => {
                    if (isActive && bookmarkId) {
                      onToggleBookmark(primaryVerse, bmc.key, bookmarkId);
                    } else if (isBookmarked && bookmarkId) {
                      // Already bookmarked in different color — remove old, add new
                      onToggleBookmark(primaryVerse, bmc.key, bookmarkId);
                    } else {
                      onToggleBookmark(primaryVerse, bmc.key);
                    }
                    onDismiss();
                  }}
                >
                  <Bookmark className={`absolute inset-0 m-auto ${isVertical ? "h-4 w-4" : "h-3 w-3"} text-white drop-shadow-sm`} />
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <X className={`${isVertical ? "h-4 w-4" : "h-3.5 w-3.5"} text-white drop-shadow-sm`} />
                    </span>
                  )}
                </button>
              );
            })}
            {/* ── "+" expansion button ── */}
            <button
              className={`flex ${isVertical ? "h-9 w-9" : "h-6 w-6"} items-center justify-center rounded-full border border-dashed border-muted-foreground/40 hover:bg-muted transition-colors text-muted-foreground`}
              title="Bookmark with next color"
              onClick={() => {
                const nextColor = getNextExpansionColor(usedBookmarkColors ?? new Set());
                if (isBookmarked && bookmarkId) {
                  // Replace with expansion color
                  onToggleBookmark(primaryVerse, nextColor.key, bookmarkId);
                } else {
                  onToggleBookmark(primaryVerse, nextColor.key);
                }
                onDismiss();
              }}
            >
              <Plus className={`${isVertical ? "h-4 w-4" : "h-3 w-3"}`} />
            </button>
          </div>
        </div>
      )}

      {isVertical ? <div className="h-px bg-border" /> : <div className="mx-1 h-6 w-px bg-border" />}

      {/* ── Action buttons ── */}
      <div className={`flex items-center ${isVertical ? "gap-3" : "gap-1"}`}>
        {/* ── Add Note ── */}
        {primaryVerse && (
          <button
            className={`flex ${isVertical ? "h-10 flex-1 gap-2 rounded-lg border border-border px-3" : "h-8 w-8"} items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
            title="Add note"
            onClick={() => {
              onAddNote(primaryVerse);
              onDismiss();
            }}
          >
            <StickyNote className="h-4 w-4" />
            {isVertical && <span className="text-sm">Add Note</span>}
          </button>
        )}

        {/* ── Cross-References ── */}
        {primaryVerse && onCrossRef && (
          <button
            className={`flex ${isVertical ? "h-10 flex-1 gap-2 rounded-lg border border-border px-3" : "h-8 gap-1 px-2"} items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
            title="Cross-references"
            onClick={() => {
              onCrossRef(primaryVerse);
              onDismiss();
            }}
          >
            <BookMarked className="h-4 w-4" />
            {isVertical && <span className="text-sm">Cross-refs</span>}
          </button>
        )}

        {/* ── Reference (Word Study) ── */}
        {primaryVerse && onReference && (
          <button
            className={`flex ${isVertical ? "h-10 flex-1 gap-2 rounded-lg border border-border px-3" : "h-8 gap-1 px-2"} items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
            title="Word study & reference"
            onClick={() => {
              onReference(primaryVerse);
              onDismiss();
            }}
          >
            <BookOpen className="h-4 w-4" />
            {isVertical && <span className="text-sm">Reference</span>}
          </button>
        )}

        {/* ── Verse Bunch (only for multi-verse selection) ── */}
        {selectedVerses.length >= 2 && (
          <button
            className={`flex ${isVertical ? "h-10 flex-1 gap-2 rounded-lg border border-border px-3" : "h-8 gap-1 px-2"} items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
            title="Create Verse Bunch"
            onClick={() => {
              onCreateBunch();
              onDismiss();
            }}
          >
            <Package className="h-4 w-4" />
            <span className={`font-medium ${isVertical ? "text-sm" : "text-xs"}`}>Bunch</span>
          </button>
        )}

        {/* ── Add to existing Bunch ── */}
        {hasBunches && onAddToBunch && (
          <button
            className={`flex ${isVertical ? "h-10 flex-1 gap-2 rounded-lg border border-border px-3" : "h-8 gap-1 px-2"} items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
            title="Add to a Bunch"
            onClick={() => {
              onAddToBunch();
              onDismiss();
            }}
          >
            <Package className="h-4 w-4" />
            <span className={`font-medium ${isVertical ? "text-sm" : "text-xs"}`}>+ Bunch</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function FloatingToolbar(props: FloatingToolbarProps) {
  const {
    position,
    isAuthenticated,
    onDismiss,
    selectedVerses,
    ...actionProps
  } = props;
  const isMobile = useIsMobile();

  /* ── Not authenticated — show simple message ── */
  if (!isAuthenticated) {
    if (isMobile) {
      return (
        <Sheet open={selectedVerses.length > 0} onOpenChange={(open) => { if (!open) onDismiss(); }}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader>
              <SheetTitle className="text-base">Sign In Required</SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to highlight, bookmark & take notes on KeepRead.ing.
            </p>
          </SheetContent>
        </Sheet>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
        style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
      >
        <p className="text-sm text-muted-foreground">Sign in to highlight, bookmark & take notes</p>
      </motion.div>
    );
  }

  /* ── Mobile: bottom sheet ── */
  if (isMobile) {
    return (
      <Sheet open={selectedVerses.length > 0} onOpenChange={(open) => { if (!open) onDismiss(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 px-6">
          <SheetHeader>
            <SheetTitle className="text-base">
              Verse {selectedVerses.length === 1 ? selectedVerses[0] : `${selectedVerses[0]}–${selectedVerses[selectedVerses.length - 1]}`}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ToolbarActions
              selectedVerses={selectedVerses}
              onDismiss={onDismiss}
              layout="vertical"
              {...actionProps}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  /* ── Desktop: floating toolbar ── */
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 rounded-xl border border-border bg-card shadow-2xl max-w-[calc(100vw-2rem)]"
      style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <ToolbarActions
          selectedVerses={selectedVerses}
          onDismiss={onDismiss}
          layout="horizontal"
          {...actionProps}
        />
        {/* ── Dismiss ── */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground ml-1"
          title="Dismiss"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Note input inline panel ── */
export interface NoteInputProps {
  verseNumber: number;
  existingContent?: string;
  existingId?: string;
  onSave: (content: string, existingId?: string) => void;
  onCancel: () => void;
}

export function NoteInputPanel({
  verseNumber,
  existingContent,
  existingId,
  onSave,
  onCancel,
}: NoteInputProps) {
  const [content, setContent] = useState(existingContent ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 mb-3 rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Note on verse {verseNumber}
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your thoughts, reflections, or prayer notes…"
        className="min-h-[80px] resize-none text-sm"
        maxLength={2000}
        autoFocus
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!content.trim()}
          onClick={() => {
            if (content.trim()) {
              onSave(content.trim(), existingId);
            }
          }}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </motion.div>
  );
}
