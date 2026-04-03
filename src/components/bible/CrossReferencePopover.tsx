import React, { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CrossReference {
  label: string;
  bookUsfm: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  confidence: number;
}

interface CrossReferencePopoverProps {
  bookUsfm: string;
  chapterNumber: string;
  verseNumber: number;
  versionId: number;
  verseText: string;
  onNavigate: (bookUsfm: string, chapter: number, verse?: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorEl?: HTMLElement | null;
  children?: React.ReactNode;
}

async function fetchCrossRefs(verseText: string): Promise<CrossReference[]> {
  const query = `Find cross-references and related verses for: "${verseText.slice(0, 300)}"`;
  const { data, error } = await supabase.functions.invoke("bible-search", {
    body: { query },
  });
  if (error) throw error;
  return (data?.suggestions ?? []).slice(0, 8);
}

function CrossRefItem({
  ref_: CrossReference;
  versionId: number;
  onNavigate: (bookUsfm: string, chapter: number, verse?: number) => void;
  onClose: () => void;
}) {
  // Fetch a short preview of the verse text
  const { data: previewText, isLoading } = useQuery({
    queryKey: ["cross-ref-preview", ref_.bookUsfm, ref_.chapter, ref_.verseStart, versionId],
    queryFn: async () => {
      if (!ref_.bookUsfm || !ref_.chapter) return "";
      const path = `/bible/${versionId}/verses/${ref_.bookUsfm}.${ref_.chapter}.${ref_.verseStart ?? 1}`;
      // Try local cache first via supabase
      const { data: cached } = await supabase
        .from("bible_cache")
        .select("payload")
        .eq("request_path", path)
        .maybeSingle();
      if (cached?.payload) {
        const p = cached.payload as any;
        return (p.content ?? p.text ?? "").replace(/<[^>]+>/g, "").slice(0, 120);
      }
      // Fetch via proxy
      const { data, error } = await supabase.functions.invoke("youversion-proxy", {
        body: { path },
      });
      if (error || !data) return "";
      const text = (data.content ?? data.text ?? "").replace(/<[^>]+>/g, "");
      return text.slice(0, 120);
    },
    staleTime: Infinity,
    enabled: !!ref_.bookUsfm,
  });

  return (
    <button
      className="w-full text-left p-3 rounded-lg hover:bg-muted/60 transition-colors group"
      onClick={() => {
        onNavigate(ref_.bookUsfm, ref_.chapter, ref_.verseStart);
        onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold text-foreground">
          {ref_.label?.split("—")[0]?.trim() || `${ref_.bookUsfm} ${ref_.chapter}:${ref_.verseStart ?? ""}`}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      {isLoading ? (
        <Skeleton className="h-3 w-3/4 mt-1.5" />
      ) : previewText ? (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body italic leading-relaxed">
          {previewText}…
        </p>
      ) : null}
      {ref_.confidence >= 0.9 && (
        <span className="inline-flex items-center gap-0.5 mt-1 text-[0.6rem] text-primary/70">
          <Sparkles className="h-2.5 w-2.5" /> Strong match
        </span>
      )}
    </button>
  );
}

export function CrossReferencePopover({
  bookUsfm,
  chapterNumber,
  verseNumber,
  versionId,
  verseText,
  onNavigate,
  open,
  onOpenChange,
  children,
}: CrossReferencePopoverProps) {
  const { data: crossRefs, isLoading, error } = useQuery({
    queryKey: ["cross-refs", bookUsfm, chapterNumber, verseNumber],
    queryFn: () => fetchCrossRefs(verseText),
    staleTime: 30 * 60 * 1000,
    enabled: open && !!verseText,
  });

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children || <span />}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] p-0 rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary/70" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Cross-References
            </h3>
          </div>
          <p className="text-[0.65rem] text-muted-foreground mt-0.5">
            Verse {verseNumber} — AI-suggested related passages
          </p>
        </div>

        <ScrollArea className="max-h-[320px]">
          <div className="p-2 space-y-0.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            ) : error ? (
              <p className="p-4 text-xs text-muted-foreground text-center">
                Unable to load cross-references. Please try again.
              </p>
            ) : crossRefs && crossRefs.length > 0 ? (
              crossRefs.map((ref_, idx) => (
                <CrossRefItem
                  key={`${ref_.bookUsfm}-${ref_.chapter}-${ref_.verseStart}-${idx}`}
                  ref_={ref_}
                  versionId={versionId}
                  onNavigate={onNavigate}
                  onClose={() => onOpenChange(false)}
                />
              ))
            ) : (
              <div className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No cross-references found for this verse.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
