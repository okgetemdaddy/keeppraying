import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Package,
  Highlighter,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

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
  /** Verse numbers currently selected (tap-select mode) */
  selectedVerses: number[];
  /** Whether this is a partial text selection within a single verse */
  isPartialSelection: boolean;
  partialSelectionVerse?: number;
  partialSelectionRange?: { start: number; end: number };
  /** Whether the selected verse(s) are already bookmarked */
  isBookmarked: boolean;
  bookmarkId?: string;
  /** Existing highlight info for unhighlight X overlay */
  existingHighlightColor?: string;
  existingHighlightId?: string;
  /** Callbacks */
  onHighlight: (color: string, verseNumber: number, start?: number, end?: number) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onToggleBookmark: (verseNumber: number, existingId?: string) => void;
  onAddNote: (verseNumber: number) => void;
  onCreateBunch: () => void;
  onDismiss: () => void;
  /** Is the user authenticated */
  isAuthenticated: boolean;
}

export function FloatingToolbar({
  position,
  selectedVerses,
  isPartialSelection,
  partialSelectionVerse,
  partialSelectionRange,
  isBookmarked,
  bookmarkId,
  onHighlight,
  onToggleBookmark,
  onAddNote,
  onCreateBunch,
  onDismiss,
  isAuthenticated,
}: FloatingToolbarProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const isMobile = useIsMobile();

  const toolbarStyle = isMobile
    ? { left: "50%", transform: "translateX(-50%)", top: position.y }
    : { left: position.x, top: position.y, transform: "translateX(-50%)" };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
        style={toolbarStyle}
      >
        <p className="text-sm text-muted-foreground">Sign in to highlight, bookmark & take notes</p>
      </motion.div>
    );
  }

  const primaryVerse =
    isPartialSelection && partialSelectionVerse
      ? partialSelectionVerse
      : selectedVerses[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 rounded-xl border border-border bg-card shadow-2xl max-w-[calc(100vw-2rem)]"
      style={toolbarStyle}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* ── Colour swatches ── */}
        {SWATCH_COLORS.map((swatch) => (
          <button
            key={swatch.key}
            className={`h-6 w-6 rounded-full ${swatch.bg} hover:ring-2 ${swatch.ring} ring-offset-1 ring-offset-card transition-all`}
            title={`Highlight ${swatch.key}`}
            onClick={() => {
              if (isPartialSelection && partialSelectionVerse && partialSelectionRange) {
                onHighlight(
                  swatch.key,
                  partialSelectionVerse,
                  partialSelectionRange.start,
                  partialSelectionRange.end,
                );
              } else {
                // Highlight each selected whole verse
                selectedVerses.forEach((vn) => onHighlight(swatch.key, vn));
              }
              onDismiss();
            }}
          />
        ))}

        <div className="mx-1 h-6 w-px bg-border" />

        {/* ── Bookmark toggle ── */}
        {primaryVerse && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground"
            title={isBookmarked ? "Remove bookmark" : "Bookmark verse"}
            onClick={() => {
              onToggleBookmark(primaryVerse, bookmarkId);
              onDismiss();
            }}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        )}

        {/* ── Add Note ── */}
        {primaryVerse && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground"
            title="Add note"
            onClick={() => {
              onAddNote(primaryVerse);
              onDismiss();
            }}
          >
            <StickyNote className="h-4 w-4" />
          </button>
        )}

        {/* ── Verse Bunch (only for multi-verse selection) ── */}
        {selectedVerses.length >= 2 && (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            <button
              className="flex h-8 items-center gap-1 rounded-lg px-2 hover:bg-muted transition-colors text-foreground"
              title="Create Verse Bunch"
              onClick={() => {
                onCreateBunch();
                onDismiss();
              }}
            >
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">Bunch</span>
            </button>
          </>
        )}

        {/* ── Dismiss ── */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
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
