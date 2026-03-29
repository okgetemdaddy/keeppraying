/**
 * BibleCard — renders a Bible passage from YouVersion in our sacred aesthetic.
 * Uses existing Card/Skeleton components. Strips generic YouVersion styles.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { usePassage } from "@/hooks/use-youversion";

interface BibleCardProps {
  /** USFM reference, e.g. "JHN.3.16" or "PSA.23" */
  usfm: string;
  /** Bible version ID (default: 111 = NIV) */
  versionId?: number;
  /** Optional custom title above the passage */
  title?: string;
}

export function BibleCard({ usfm, versionId, title }: BibleCardProps) {
  const { data, loading, error } = usePassage(usfm, versionId);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Graceful — don't show a broken card
  }

  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title || "Scripture"}
          </span>
        </div>

        {/* Passage HTML — override generic styles */}
        <div
          className="bible-passage font-display text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />

        {/* Reference + VerseLink */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-xs font-semibold text-primary">
            {data.reference}
          </span>
          <VerseLink reference={data.reference} />
          <span className="text-[10px] text-muted-foreground ml-auto">
            {data.versionName}
          </span>
        </div>

        {/* Copyright */}
        {data.copyright && (
          <p className="text-[9px] text-muted-foreground/60 mt-2">
            {data.copyright}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
