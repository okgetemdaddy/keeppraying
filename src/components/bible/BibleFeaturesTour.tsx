import React, { useState } from "react";
import {
  Highlighter,
  Bookmark,
  StickyNote,
  Package,
  Type,
  Globe,
  List,
  AlignJustify,
  MousePointerClick,
  Sparkles,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet as Sheet,
  ResponsiveSheetContent as SheetContent,
  ResponsiveSheetHeader as SheetHeader,
  ResponsiveSheetTitle as SheetTitle,
  ResponsiveSheetDescription as SheetDescription,
} from "@/components/ui/responsive-sheet";
import { BibleSuggestionSheet } from "@/components/bible/BibleSuggestionSheet";

const FEATURES = [
  {
    icon: Highlighter,
    title: "Verse Highlighting",
    description: "Choose from 6 beautiful colors to highlight any verse or partial text.",
    color: "text-yellow-500",
  },
  {
    icon: Bookmark,
    title: "Ribbon Bookmarks",
    description: "Bookmark verses to find them again quickly from your Bible Sleeve.",
    color: "text-primary",
  },
  {
    icon: StickyNote,
    title: "Inline Notes",
    description: "Write reflections, prayers, or study notes on any verse.",
    color: "text-amber-500",
  },
  {
    icon: Package,
    title: "Verse Bunches",
    description: "Group verses across books and chapters for study, devotionals, or sharing.",
    color: "text-violet-500",
  },
  {
    icon: MousePointerClick,
    title: "Partial & Multi-Select",
    description: "Highlight specific words, or select multiple verses at once.",
    color: "text-sky-500",
  },
  {
    icon: Globe,
    title: "Cross-Translation Annotations",
    description: "See your highlights and notes across all Bible translations.",
    color: "text-emerald-500",
  },
  {
    icon: List,
    title: "Reading Modes",
    description: "Switch between verse-by-verse and paragraph layouts.",
    color: "text-foreground",
  },
  {
    icon: Type,
    title: "Text Size",
    description: "Adjust reading size for comfortable study.",
    color: "text-muted-foreground",
  },
];

interface BibleFeaturesTourProps {
  open: boolean;
  onAcknowledge: () => void;
}

export function BibleFeaturesTour({ open, onAcknowledge }: BibleFeaturesTourProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);

  return (
    <>
      <Sheet open={open && !showSuggestion} onOpenChange={(o) => { if (!o) onAcknowledge(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8 px-5">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-bold tracking-tight">
              Welcome to God's Word ✨
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground leading-relaxed">
              Here's everything you can do while reading Scripture.
            </SheetDescription>
          </SheetHeader>

          {/* ── Suggestion link ── */}
          <button
            onClick={() => setShowSuggestion(true)}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Make a Suggestion…
          </button>

          {/* ── Feature list ── */}
          <div className="mt-5 space-y-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                <f.icon className={`h-5 w-5 shrink-0 mt-0.5 ${f.color}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── More coming ── */}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            More features are on their way…
          </div>

          {/* ── Acknowledge button ── */}
          <Button
            onClick={onAcknowledge}
            className="mt-6 w-full"
            size="lg"
          >
            Thanks for letting me know
          </Button>
        </SheetContent>
      </Sheet>

      <BibleSuggestionSheet
        open={showSuggestion}
        onClose={() => setShowSuggestion(false)}
      />
    </>
  );
}
