import React from "react";
import {
  ArrowLeft,
  Highlighter,
  Bookmark,
  StickyNote,
  Package,
  AArrowDown,
  AArrowUp,
  List,
  AlignJustify,
  Globe,
  Eye,
  EyeOff,
  Moon,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveSheet as Sheet,
  ResponsiveSheetContent as SheetContent,
  ResponsiveSheetHeader as SheetHeader,
  ResponsiveSheetTitle as SheetTitle,
} from "@/components/ui/responsive-sheet";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";
import { getBookmarkColorDef } from "@/components/bible/bookmarkColors";
import type { UserHighlight, UserNote, UserBookmark } from "@/hooks/useBibleChapterData";
import type { BunchWithCount } from "@/components/bible/VerseBunchStrip";

/* ── Highlight colour display map ── */
const COLOR_DOTS: Record<string, string> = {
  yellow: "bg-yellow-400",
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  pink: "bg-pink-400",
  purple: "bg-violet-400",
  orange: "bg-orange-400",
};

interface BibleSleeveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;

  /* settings */
  textSize: number;
  minSize: number;
  maxSize: number;
  onTextSizeChange: (size: number) => void;
  readingMode: "verse" | "paragraph";
  onReadingModeChange: (mode: "verse" | "paragraph") => void;
  crossTranslation: boolean;
  onToggleCrossTranslation: () => void;
  hideBunches: boolean;
  onToggleHideBunches: () => void;

  /* dark mode */
  premiumDark: boolean;
  oledMode: boolean;
  onTogglePremiumDark: (v: boolean) => void;
  onToggleOled: (v: boolean) => void;

  /* annotations for current chapter */
  highlights: UserHighlight[];
  bookmarks: UserBookmark[];
  notes: UserNote[];
  currentBook?: string;
  currentChapter?: string;

  /* all bunches */
  bunches: BunchWithCount[];
  onNavigateToBunch: (bunch: BunchWithCount) => void;

  /* verse navigation */
  onNavigateToVerse?: (verseNumber: number) => void;
}

export function BibleSleeveSheet({
  open,
  onOpenChange,
  userName,
  textSize,
  minSize,
  maxSize,
  onTextSizeChange,
  readingMode,
  onReadingModeChange,
  crossTranslation,
  onToggleCrossTranslation,
  hideBunches,
  onToggleHideBunches,
  highlights,
  bookmarks,
  notes,
  currentBook,
  currentChapter,
  bunches,
  onNavigateToBunch,
  onNavigateToVerse,
}: BibleSleeveSheetProps) {
  const displayName = userName?.split(" ")[0] || userName?.split("@")[0] || "friend";

  // Group highlights by color
  const highlightsByColor = React.useMemo(() => {
    const map: Record<string, UserHighlight[]> = {};
    highlights.forEach((h) => {
      const arr = map[h.color] || [];
      arr.push(h);
      map[h.color] = arr;
    });
    return map;
  }, [highlights]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <SheetTitle className="text-left">
            <span className="text-base font-bold text-foreground">
              Hello, {displayName}!
            </span>
            <br />
            <span className="text-sm font-medium text-muted-foreground">
              Welcome to <span className="text-primary font-semibold">Your Bible Sleeve</span>
            </span>
          </SheetTitle>
          <p className="text-[0.65rem] text-muted-foreground/60 italic mt-1.5 tracking-wide">
            All is saved automatically ✓
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-6 pb-8">

            {/* ── Text Size ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <AArrowUp className="h-3.5 w-3.5" /> Text Size
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <AArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{textSize}px</span>
                  <AArrowUp className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <Slider
                  value={[textSize]}
                  min={minSize}
                  max={maxSize}
                  step={1}
                  onValueChange={([v]) => onTextSizeChange(v)}
                  className="w-full"
                />
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* ── Reading Mode ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <List className="h-3.5 w-3.5" /> Reading Mode
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={readingMode === "verse" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onReadingModeChange("verse")}
                >
                  <List className="h-3.5 w-3.5" /> Verse
                </Button>
                <Button
                  variant={readingMode === "paragraph" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => onReadingModeChange("paragraph")}
                >
                  <AlignJustify className="h-3.5 w-3.5" /> Paragraph
                </Button>
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* ── Toggles ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Cross-Translation</span>
                </div>
                <Switch checked={crossTranslation} onCheckedChange={onToggleCrossTranslation} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hideBunches ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-sm text-foreground">Show Bunch Markers</span>
                </div>
                <Switch checked={!hideBunches} onCheckedChange={onToggleHideBunches} />
              </div>
            </section>

            <div className="h-px bg-border" />

            {/* ── Your Highlights ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Highlighter className="h-3.5 w-3.5" /> Your Highlights
                {highlights.length > 0 && (
                  <span className="ml-auto text-[0.6rem] font-normal bg-muted px-1.5 py-0.5 rounded-full">{highlights.length}</span>
                )}
              </h3>
              {highlights.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No highlights in this chapter yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(highlightsByColor).map(([color, items]) => (
                    <div key={color} className="space-y-1">
                      {items.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => onNavigateToVerse?.(h.verse_number)}
                          className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                        >
                          <span className={`h-3 w-3 rounded-full ${COLOR_DOTS[color] || "bg-gray-400"} shrink-0`} />
                          <span className="text-sm text-foreground">
                            {currentBook} {currentChapter}:{h.verse_number}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="h-px bg-border" />

            {/* ── Your Bookmarks ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Bookmark className="h-3.5 w-3.5" /> Your Bookmarks
                {bookmarks.length > 0 && (
                  <span className="ml-auto text-[0.6rem] font-normal bg-muted px-1.5 py-0.5 rounded-full">{bookmarks.length}</span>
                )}
              </h3>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No bookmarks in this chapter yet.</p>
              ) : (
                <div className="space-y-1">
                  {bookmarks.map((b) => {
                    const colorDef = getBookmarkColorDef(b.color);
                    return (
                      <button
                        key={b.id}
                        onClick={() => onNavigateToVerse?.(b.verse_number)}
                        className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <span className={`h-3 w-3 rounded-full ${colorDef.dot} shrink-0`} />
                        <span className="text-sm text-foreground">
                          {currentBook} {currentChapter}:{b.verse_number}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="h-px bg-border" />

            {/* ── Your Notes ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <StickyNote className="h-3.5 w-3.5" /> Your Notes
                {notes.length > 0 && (
                  <span className="ml-auto text-[0.6rem] font-normal bg-muted px-1.5 py-0.5 rounded-full">{notes.length}</span>
                )}
              </h3>
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No notes in this chapter yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {notes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onNavigateToVerse?.(n.verse_number)}
                      className="flex flex-col items-start w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-medium text-primary">
                        {currentBook} {currentChapter}:{n.verse_number}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.note_content}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="h-px bg-border" />

            {/* ── Your Verse Bunches ── */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Package className="h-3.5 w-3.5" /> Your Verse Bunches
                {bunches.length > 0 && (
                  <span className="ml-auto text-[0.6rem] font-normal bg-muted px-1.5 py-0.5 rounded-full">{bunches.length}</span>
                )}
              </h3>
              {bunches.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No verse bunches yet. Select 2+ verses to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {bunches.map((b, idx) => {
                    const color = getBunchColor(idx);
                    const classes = BUNCH_COLOR_CLASSES[color];
                    return (
                      <button
                        key={b.id}
                        onClick={() => onNavigateToBunch(b)}
                        className={`flex items-center gap-2.5 w-full text-left rounded-lg border ${classes.pill} px-3 py-2.5 hover:opacity-80 transition-colors`}
                      >
                        <Package className={`h-4 w-4 shrink-0 ${classes.pillText}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${classes.pillText} truncate`}>{b.bunch_name}</p>
                          {b.description && (
                            <p className="text-[0.65rem] text-muted-foreground line-clamp-1">{b.description}</p>
                          )}
                          <p className="text-[0.6rem] text-muted-foreground mt-0.5">{b.item_count} verse{b.item_count !== 1 ? "s" : ""}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
