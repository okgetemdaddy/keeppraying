import React, { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  PenTool,
  Hand,
  Mic,
  ZoomIn,
  BookOpen,
  Layers,
  Type,
  GripVertical,
  Circle,
  Lightbulb,
  Highlighter,
  Bookmark,
  StickyNote,
  Package,
  Globe,
  Search,
  Sparkles,
  ChevronRight,
  MousePointerClick,
  ArrowLeftRight,
  Undo2,
  Trash2,
  SwatchBook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Types ── */

interface HelpCard {
  id: string;
  category: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  steps: string[];
  actionLabel?: string;
  actionId?: string;
}

/* ── Help Data ── */

const HELP_CARDS: HelpCard[] = [
  // ── Inking ──
  {
    id: "full-writing",
    category: "Inking",
    title: "Full-Page Writing Surface",
    icon: <PenTool className="h-5 w-5" />,
    summary: "Write anywhere on the Bible page with Apple Pencil",
    steps: [
      "The entire page below the header is a writable surface",
      "Palm rejection is built in — only Pencil draws",
      "Toggle finger drawing in the ink bar if needed",
    ],
  },
  {
    id: "pen-colors",
    category: "Inking",
    title: "Ink Colors & Pen Size",
    icon: <SwatchBook className="h-5 w-5" />,
    summary: "Choose between calligraphic inks — Iron Gall, Oxblood, Sepia & more",
    steps: [
      "Tap the color dot in the ink bar to see all options",
      "Drag the size slider to adjust stroke width",
      "Each color is tuned for dark and light themes",
    ],
  },
  {
    id: "zoom-precision",
    category: "Inking",
    title: "Zoom Works Perfectly",
    icon: <ZoomIn className="h-5 w-5" />,
    summary: "Pen tip stays aligned at every zoom level — no offset",
    steps: [
      "Use the zoom slider (1×–5×) in the ink bar",
      "Draw at any scale — coordinates auto-normalize",
      "Perfect for fine margin notes or detail work",
    ],
  },
  {
    id: "undo-redo",
    category: "Inking",
    title: "50-Step Undo & Redo",
    icon: <Undo2 className="h-5 w-5" />,
    summary: "Full undo/redo history for every stroke",
    steps: [
      "Tap undo/redo arrows in the ink bar",
      "History supports up to 50 steps per session",
      "Clearing the page moves strokes to the Trash Bin",
    ],
  },
  {
    id: "ink-trash",
    category: "Inking",
    title: "Ink Trash Bin & Recovery",
    icon: <Trash2 className="h-5 w-5" />,
    summary: "Cleared ink is never permanently lost — restore anytime",
    steps: [
      "When you clear the page, strokes are saved to the trash",
      "Open the trash bin from the ink bar to preview sessions",
      "Tap any session thumbnail to restore all its strokes",
    ],
    actionLabel: "Open Trash Bin",
    actionId: "openTrash",
  },

  // ── Tools ──
  {
    id: "ink-bar",
    category: "Tools",
    title: "Expandable Ink Bar",
    icon: <GripVertical className="h-5 w-5" />,
    summary: "Compact toolbar that expands to reveal all writing tools",
    steps: [
      "Tap the arrows to expand left (selection tools) or right (eraser, mic)",
      "Drag to reposition the bar anywhere on screen",
      "Collapses automatically to keep your reading clear",
    ],
  },
  {
    id: "selection-tool",
    category: "Tools",
    title: "Selection Tool — Move Handwriting",
    icon: <MousePointerClick className="h-5 w-5" />,
    summary: "Select, drag, and reposition your ink strokes",
    steps: [
      "Expand the left side of the ink bar → tap the selection icon",
      "Tap or lasso the strokes you want to move",
      "Drag the group to its new position, then tap DONE",
    ],
  },
  {
    id: "gesture-select",
    category: "Tools",
    title: "Circle or Underline to Select",
    icon: <Circle className="h-5 w-5" />,
    summary: "Draw a circle or underline over text for an instant action menu",
    steps: [
      "Enable gesture recognition in Writing Settings",
      "Draw a circle or underline over any word or verse",
      "The highlight/note/bookmark menu appears automatically",
    ],
  },

  // ── Navigation ──
  {
    id: "swipe-chapter",
    category: "Navigation",
    title: "Swipe to Change Chapter",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    summary: "Swipe left or right on the page to flip between chapters",
    steps: [
      "Use a horizontal finger swipe across the text area",
      "Swipe right → previous chapter, left → next chapter",
      "Your ink and annotations travel with each chapter",
    ],
  },
  {
    id: "thumbnails",
    category: "Navigation",
    title: "Chapter Thumbnail Strip",
    icon: <Layers className="h-5 w-5" />,
    summary: "See visual previews of surrounding chapters with your ink",
    steps: [
      "Pull down from the top of the reading area",
      "Browse before/current/after chapters as thumbnails",
      "Tap any thumbnail to jump directly",
    ],
    actionLabel: "Show Thumbnails",
    actionId: "openThumbnails",
  },

  // ── Pocket ──
  {
    id: "bible-pocket",
    category: "Pocket",
    title: "Bible Pocket — Your Study Hub",
    icon: <BookOpen className="h-5 w-5" />,
    summary: "All your annotations, voice notes, and ink for this chapter in one place",
    steps: [
      "Tap the Pocket icon in the toolbar or sleeve",
      "View ink stroke count, typed notes, and voice transcripts",
      "Everything is organized by time — newest first",
    ],
  },

  // ── Voice / Text ──
  {
    id: "voice-annotation",
    category: "Voice",
    title: "Voice-to-Verse Annotations",
    icon: <Mic className="h-5 w-5" />,
    summary: "Speak and your words are transcribed & linked to the nearest verse",
    steps: [
      "Expand the right side of the ink bar → tap the mic icon",
      "Speak naturally — a live waveform shows your audio",
      "When done, the transcript is saved as a verse annotation",
    ],
    actionLabel: "Start Voice Note",
    actionId: "openVoice",
  },
  {
    id: "convert-text",
    category: "Voice",
    title: "Handwriting → Editable Text",
    icon: <Type className="h-5 w-5" />,
    summary: "Convert selected handwritten strokes into typed, editable text",
    steps: [
      "Enter Selection mode from the ink bar",
      "Select the handwritten strokes you want to convert",
      "Choose 'Convert to Text' — now editable and searchable",
    ],
  },

  // ── Highlighting & Annotations ──
  {
    id: "verse-highlighting",
    category: "Annotations",
    title: "Verse Highlighting",
    icon: <Highlighter className="h-5 w-5" />,
    summary: "Choose from 6 beautiful colors to highlight any verse",
    steps: [
      "Tap a verse to open the floating toolbar",
      "Select a highlight color from the palette",
      "Partial text selection highlights only what you choose",
    ],
  },
  {
    id: "ribbon-bookmarks",
    category: "Annotations",
    title: "Ribbon Bookmarks",
    icon: <Bookmark className="h-5 w-5" />,
    summary: "Bookmark verses to find them quickly from the Bible Sleeve",
    steps: [
      "Tap a verse → choose the bookmark ribbon icon",
      "Pick a ribbon color to categorize your bookmarks",
      "Access all bookmarks from the Sleeve side-drawer",
    ],
  },
  {
    id: "inline-notes",
    category: "Annotations",
    title: "Inline Notes",
    icon: <StickyNote className="h-5 w-5" />,
    summary: "Write reflections, prayers, or study notes on any verse",
    steps: [
      "Tap a verse → choose the note icon from the toolbar",
      "Type your reflection in the note panel that appears",
      "Notes are marked with a small amber indicator inline",
    ],
  },
  {
    id: "verse-bunches",
    category: "Annotations",
    title: "Verse Bunches",
    icon: <Package className="h-5 w-5" />,
    summary: "Group verses across books for study, devotionals, or sharing",
    steps: [
      "Select one or more verses → tap 'Add to Bunch'",
      "Create a new bunch or add to an existing one",
      "View all your bunches in the Bible Sleeve",
    ],
  },
  {
    id: "cross-translation",
    category: "Annotations",
    title: "Cross-Translation Annotations",
    icon: <Globe className="h-5 w-5" />,
    summary: "Your highlights and notes appear in every Bible translation",
    steps: [
      "Enable cross-translation in the Bible Sleeve settings",
      "Switch versions — your annotations follow automatically",
      "Works for highlights, bookmarks, notes, and bunches",
    ],
  },

  // ── Display ──
  {
    id: "text-size",
    category: "Display",
    title: "Adjustable Text Size",
    icon: <Type className="h-5 w-5" />,
    summary: "Make the text comfortable for your reading distance",
    steps: [
      "Open the Bible Sleeve → find the text size slider",
      "Drag to increase or decrease the font size",
      "Changes apply instantly and persist across sessions",
    ],
  },
  {
    id: "premium-dark",
    category: "Display",
    title: "Premium Dark & OLED Modes",
    icon: <Lightbulb className="h-5 w-5" />,
    summary: "Reduce eye strain with warm dark themes designed for night reading",
    steps: [
      "Open the Bible Sleeve → toggle Premium Dark mode",
      "Enable OLED mode for true-black backgrounds",
      "Use 'Ease the Eyes' dimmer for further brightness control",
    ],
  },
  {
    id: "reading-modes",
    category: "Display",
    title: "Verse-by-Verse & Paragraph Layout",
    icon: <BookOpen className="h-5 w-5" />,
    summary: "Switch between structured verse view and flowing paragraph text",
    steps: [
      "Use the layout toggle in the top toolbar",
      "Verse mode shows each verse on its own line with numbers",
      "Paragraph mode flows text naturally like a book",
    ],
  },
];

const CATEGORIES = ["All", "Inking", "Tools", "Navigation", "Pocket", "Voice", "Annotations", "Display"];

/* ── Component ── */

interface HowToGuideProps {
  onTryAction?: (actionId: string) => void;
}

export function HowToGuide({ onTryAction }: HowToGuideProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HELP_CARDS.filter((card) => {
      const matchesCategory = activeCategory === "All" || card.category === activeCategory;
      const matchesSearch =
        !q ||
        card.title.toLowerCase().includes(q) ||
        card.summary.toLowerCase().includes(q) ||
        card.steps.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border/40 rounded-xl h-9 text-sm"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/25 mb-2" />
              <p className="text-sm text-muted-foreground">No matching features found</p>
            </div>
          ) : (
            filtered.map((card) => {
              const isExpanded = expandedCard === card.id;

              return (
                <button
                  key={card.id}
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className={cn(
                    "w-full text-left rounded-2xl border border-border/40 p-3.5 transition-all",
                    isExpanded
                      ? "bg-primary/5 border-primary/20"
                      : "bg-background/60 hover:bg-muted/30",
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                        isExpanded
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {card.title}
                      </p>
                      <p className="text-[0.7rem] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
                        {card.summary}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                        isExpanded && "rotate-90",
                      )}
                    />
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 pl-12 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {card.summary}
                      </p>
                      <ol className="space-y-1.5">
                        {card.steps.map((step, i) => (
                          <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[0.6rem] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      {card.actionId && card.actionLabel && onTryAction && (
                        <Button
                          size="sm"
                          className="w-full mt-2 rounded-xl h-8 text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTryAction(card.actionId!);
                          }}
                        >
                          {card.actionLabel}
                          <Sparkles className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
