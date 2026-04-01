import React, { useState, useCallback, useMemo } from "react";
import { PenTool, Layers, BookOpen } from "lucide-react";
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
  Sun,
  Moon,
  Smartphone,
  Star,
  Trash2,
  Maximize,
  ChevronDown,
  Eclipse,
} from "lucide-react";
import { TrashBinSheet } from "@/components/TrashBinSheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

/* ── Collapsible section IDs ── */
const SECTION_IDS = {
  textSize: "text-size",
  readingMode: "reading-mode",
  toggles: "toggles",
  appearance: "appearance",
  immersive: "immersive",
  studyMode: "study-mode",
  highlights: "highlights",
  bookmarks: "bookmarks",
  notes: "notes",
  bunches: "bunches",
} as const;

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem("bible_sleeve_collapsed");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveCollapsed(set: Set<string>) {
  try { localStorage.setItem("bible_sleeve_collapsed", JSON.stringify([...set])); } catch {}
}

/* ── Collapsible section header ── */
function SectionHeader({
  icon: Icon,
  label,
  badge,
  isOpen,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left group"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span className="text-[0.6rem] font-normal bg-muted px-1.5 py-0.5 rounded-full">{badge}</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
        />
      </button>
    </CollapsibleTrigger>
  );
}

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
  crossBunchTranslation: boolean;
  onToggleCrossBunchTranslation: () => void;
  hideBunches: boolean;
  onToggleHideBunches: () => void;

  /* dark mode */
  premiumDark: boolean;
  oledMode: boolean;
  onTogglePremiumDark: (v: boolean) => void;
  onToggleOled: (v: boolean) => void;

  /* ease the eyes */
  easeEyesDim: number;
  onEaseEyesDimChange: (v: number) => void;

  /* annotations for current chapter */
  highlights: UserHighlight[];
  bookmarks: UserBookmark[];
  notes: UserNote[];
  currentBook?: string;
  currentChapter?: string;

  /* all bunches */
  bunches: BunchWithCount[];
  onNavigateToBunch: (bunch: BunchWithCount) => void;
  onSetActiveBunch?: (bunchId: string) => void;
  onDeleteBunch?: (bunchId: string) => void;

  /* verse navigation */
  onNavigateToVerse?: (verseNumber: number) => void;

  /* immersive mode */
  immersiveSupported?: boolean;
  immersiveStandalone?: boolean;
  immersiveIOSLimited?: boolean;
  immersiveActive?: boolean;
  onToggleImmersive?: (v: boolean) => void;

  /* study mode */
  studyMode?: boolean;
  studyModeVariant?: "margin" | "canvas" | "journal";
  pencilDetected?: boolean;
  onToggleStudyMode?: (v: boolean) => void;
  onStudyModeVariantChange?: (v: "margin" | "canvas" | "journal") => void;
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
  crossBunchTranslation,
  onToggleCrossBunchTranslation,
  hideBunches,
  onToggleHideBunches,
  premiumDark,
  oledMode,
  onTogglePremiumDark,
  onToggleOled,
  easeEyesDim,
  onEaseEyesDimChange,
  highlights,
  bookmarks,
  notes,
  currentBook,
  currentChapter,
  bunches,
  onNavigateToBunch,
  onSetActiveBunch,
  onDeleteBunch,
  onNavigateToVerse,
  immersiveSupported,
  immersiveStandalone,
  immersiveIOSLimited,
  immersiveActive,
  onToggleImmersive,
  studyMode,
  pencilDetected,
  onToggleStudyMode,
}: BibleSleeveSheetProps) {
  const displayName = userName?.split(" ")[0] || userName?.split("@")[0] || "friend";
  const [contextBunchId, setContextBunchId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapsed sections
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsed(next);
      return next;
    });
  }, []);
  const isOpen = useCallback((id: string) => !collapsed.has(id), [collapsed]);

  // Group highlights by color
  const highlightsByColor = useMemo(() => {
    const map: Record<string, UserHighlight[]> = {};
    highlights.forEach((h) => {
      const arr = map[h.color] || [];
      arr.push(h);
      map[h.color] = arr;
    });
    return map;
  }, [highlights]);

  const dimPercent = Math.round(easeEyesDim * 100);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[80vw] sm:w-[360px] p-0 flex flex-col">
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

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          <div className="space-y-5 pb-8">

            {/* ── Text Size ── */}
            <Collapsible open={isOpen(SECTION_IDS.textSize)}>
              <SectionHeader icon={AArrowUp} label="Text Size" isOpen={isOpen(SECTION_IDS.textSize)} onToggle={() => toggleSection(SECTION_IDS.textSize)} />
              <CollapsibleContent className="mt-3">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Reading Mode ── */}
            <Collapsible open={isOpen(SECTION_IDS.readingMode)}>
              <SectionHeader icon={List} label="Reading Mode" isOpen={isOpen(SECTION_IDS.readingMode)} onToggle={() => toggleSection(SECTION_IDS.readingMode)} />
              <CollapsibleContent className="mt-3">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Toggles ── */}
            <Collapsible open={isOpen(SECTION_IDS.toggles)}>
              <SectionHeader icon={Globe} label="Display Toggles" isOpen={isOpen(SECTION_IDS.toggles)} onToggle={() => toggleSection(SECTION_IDS.toggles)} />
              <CollapsibleContent className="mt-3 space-y-3">
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
                <div className={`flex items-start justify-between gap-3 transition-opacity duration-200 ${hideBunches ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground font-medium">Cross-Reference Bunches</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5 leading-relaxed">
                      Show your verse bunches no matter which translation you're reading
                    </p>
                  </div>
                  <Switch
                    checked={crossBunchTranslation}
                    onCheckedChange={onToggleCrossBunchTranslation}
                    disabled={hideBunches}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Appearance ── */}
            <Collapsible open={isOpen(SECTION_IDS.appearance)}>
              <SectionHeader icon={Sun} label="Appearance" isOpen={isOpen(SECTION_IDS.appearance)} onToggle={() => toggleSection(SECTION_IDS.appearance)} />
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground font-medium">Premium Dark Mode</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5 leading-relaxed">
                      Elegant charcoal dark theme optimized for long Bible study and eye comfort
                    </p>
                  </div>
                  <Switch
                    checked={premiumDark}
                    onCheckedChange={onTogglePremiumDark}
                    className="shrink-0 mt-0.5"
                  />
                </div>

                {/* ── Ease the Eyes ── */}
                <div className={`transition-opacity duration-200 ${!premiumDark ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Eclipse className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground font-medium flex-1">Ease the Eyes</span>
                    <span className="text-[0.65rem] text-muted-foreground tabular-nums">{dimPercent}%</span>
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground mb-2 leading-relaxed">
                    Dim text and UI elements for comfortable night reading
                  </p>
                  <Slider
                    value={[easeEyesDim]}
                    min={0.4}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => onEaseEyesDimChange(v)}
                    disabled={!premiumDark}
                    className="w-full"
                  />
                </div>

                <div className={`flex items-start justify-between gap-3 transition-opacity duration-200 ${!premiumDark ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground font-medium">True Black OLED</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5 leading-relaxed">
                      Extra battery life on OLED screens
                    </p>
                  </div>
                  <Switch
                    checked={oledMode}
                    onCheckedChange={onToggleOled}
                    disabled={!premiumDark}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Immersive Mode ── */}
            {immersiveSupported && onToggleImmersive && (
              <>
                <div className="h-px bg-border" />
                <Collapsible open={isOpen(SECTION_IDS.immersive)}>
                  <SectionHeader icon={Maximize} label="Immersive Mode" isOpen={isOpen(SECTION_IDS.immersive)} onToggle={() => toggleSection(SECTION_IDS.immersive)} />
                  <CollapsibleContent className="mt-3">
                    {immersiveIOSLimited ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                        <span className="text-sm font-medium text-foreground">Full-Screen Reading on iPhone</span>
                        <p className="text-[0.65rem] text-muted-foreground mt-1 leading-relaxed">
                          iOS doesn't support hiding browser bars directly. Add <span className="font-semibold text-primary">KeepRead.ing</span> to your Home Screen for a permanent full-screen, app-like experience with no browser UI.
                        </p>
                        <p className="text-[0.6rem] text-muted-foreground/70 mt-1.5 italic">
                          Tap the share button (↑) → "Add to Home Screen"
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground font-medium">Hide Browser Bars</span>
                            <p className="text-[0.65rem] text-muted-foreground mt-0.5 leading-relaxed">
                              {immersiveStandalone
                                ? "You're running in app mode — browser bars are already hidden"
                                : "Remove the address bar and toolbars for distraction-free reading. Swipe from top or bottom edge to exit."}
                            </p>
                          </div>
                          <Switch
                            checked={!!immersiveActive}
                            onCheckedChange={onToggleImmersive}
                            disabled={immersiveStandalone}
                            className="shrink-0 mt-0.5"
                          />
                        </div>
                        {!immersiveStandalone && !immersiveActive && (
                          <p className="text-[0.6rem] text-muted-foreground/60 italic mt-2">
                            Tip: Add to your Home Screen for a permanent app-like experience
                          </p>
                        )}
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            <div className="h-px bg-border" />

            {/* ── Your Highlights ── */}
            <Collapsible open={isOpen(SECTION_IDS.highlights)}>
              <SectionHeader icon={Highlighter} label="Your Highlights" badge={highlights.length} isOpen={isOpen(SECTION_IDS.highlights)} onToggle={() => toggleSection(SECTION_IDS.highlights)} />
              <CollapsibleContent className="mt-3">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Your Bookmarks ── */}
            <Collapsible open={isOpen(SECTION_IDS.bookmarks)}>
              <SectionHeader icon={Bookmark} label="Your Bookmarks" badge={bookmarks.length} isOpen={isOpen(SECTION_IDS.bookmarks)} onToggle={() => toggleSection(SECTION_IDS.bookmarks)} />
              <CollapsibleContent className="mt-3">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Your Notes ── */}
            <Collapsible open={isOpen(SECTION_IDS.notes)}>
              <SectionHeader icon={StickyNote} label="Your Notes" badge={notes.length} isOpen={isOpen(SECTION_IDS.notes)} onToggle={() => toggleSection(SECTION_IDS.notes)} />
              <CollapsibleContent className="mt-3">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── Your Verse Bunches ── */}
            <Collapsible open={isOpen(SECTION_IDS.bunches)}>
              <SectionHeader icon={Package} label="Your Verse Bunches" badge={bunches.length} isOpen={isOpen(SECTION_IDS.bunches)} onToggle={() => toggleSection(SECTION_IDS.bunches)} />
              <CollapsibleContent className="mt-3">
                {bunches.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No verse bunches yet. Select 2+ verses to create one.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bunches.map((b, idx) => {
                      const color = getBunchColor(idx);
                      const classes = BUNCH_COLOR_CLASSES[color];
                      const showContext = contextBunchId === b.id;
                      return (
                        <div key={b.id} className="relative">
                          <button
                            onClick={() => onNavigateToBunch(b)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextBunchId(showContext ? null : b.id);
                            }}
                            onTouchStart={() => {
                              longPressTimer.current = setTimeout(() => setContextBunchId(b.id), 500);
                            }}
                            onTouchEnd={() => {
                              if (longPressTimer.current) clearTimeout(longPressTimer.current);
                            }}
                            onTouchMove={() => {
                              if (longPressTimer.current) clearTimeout(longPressTimer.current);
                            }}
                            className={`flex items-center gap-2.5 w-full text-left rounded-lg border ${classes.pill} px-3 py-2.5 hover:opacity-80 transition-colors opacity-80`}
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
                          {/* Context menu overlay */}
                          {showContext && (
                            <div className="absolute right-2 top-1 z-10 rounded-lg border border-border bg-card shadow-lg py-1 min-w-[180px]">
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                onClick={() => {
                                  setContextBunchId(null);
                                  onSetActiveBunch?.(b.id);
                                  onOpenChange(false);
                                }}
                              >
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                Make my Active Bunch
                              </button>
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                                onClick={() => {
                                  setContextBunchId(null);
                                  onDeleteBunch?.(b.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <div className="h-px bg-border" />

            {/* ── iPad Study Mode ── */}
            {onToggleStudyMode && (
              <>
                <Collapsible open={isOpen(SECTION_IDS.studyMode)}>
                  <SectionHeader icon={PenTool} label="iPad Study Mode" isOpen={isOpen(SECTION_IDS.studyMode)} onToggle={() => toggleSection(SECTION_IDS.studyMode)} />
                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground font-medium">Handwritten Annotations</span>
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5 leading-relaxed">
                          Write directly on the page with Apple Pencil or finger. Strokes are saved per verse.
                        </p>
                      </div>
                      <Switch
                        checked={!!studyMode}
                        onCheckedChange={onToggleStudyMode}
                        className="shrink-0 mt-0.5"
                      />
                    </div>
                    {pencilDetected && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                        <span>🍎</span>
                        <span>Apple Pencil connected</span>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                <div className="h-px bg-border" />
              </>
            )}

            {/* ── Trash Bin (always visible) ── */}
            <section>
              <button
                onClick={() => setTrashOpen(true)}
                className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Trash Bin</span>
                <span className="ml-auto text-xs text-muted-foreground">30 days</span>
              </button>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <TrashBinSheet open={trashOpen} onOpenChange={setTrashOpen} context="bible" />
  </>
  );
}
