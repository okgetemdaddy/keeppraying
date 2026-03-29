import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";

interface BunchWithCount {
  id: string;
  bunch_name: string;
  description: string | null;
  item_count: number;
  first_book_usfm: string | null;
  first_chapter: number | null;
  first_verse: number | null;
  first_version_id: number | null;
}

export function useUserVerseBunches() {
  const { user } = useAuth();
  return useQuery<BunchWithCount[]>({
    queryKey: ["verse_bunches", "all", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("verse_bunches")
        .select("id, bunch_name, description, verse_bunch_items(id, book_usfm, chapter_number, verse_number, version_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) { console.warn("Failed to fetch bunches:", error.message); return []; }
      return (data ?? []).map((b: any) => {
        const items = b.verse_bunch_items ?? [];
        const first = items[0];
        return {
          id: b.id,
          bunch_name: b.bunch_name,
          description: b.description,
          item_count: items.length,
          first_book_usfm: first?.book_usfm ?? null,
          first_chapter: first?.chapter_number ?? null,
          first_verse: first?.verse_number ?? null,
          first_version_id: first?.version_id ?? null,
        };
      });
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

interface VerseBunchStripProps {
  onNavigateToBunch: (bunch: BunchWithCount) => void;
}

export function VerseBunchStrip({ onNavigateToBunch }: VerseBunchStripProps) {
  const { user } = useAuth();
  const { data: bunches } = useUserVerseBunches();

  if (!user || !bunches?.length) return null;

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-2">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <span className="text-[0.65rem] font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
              Bunches
            </span>
            <div className="mx-1 h-4 w-px bg-border shrink-0" />
            {bunches.map((b, idx) => {
              const color = getBunchColor(idx);
              const classes = BUNCH_COLOR_CLASSES[color];
              return (
                <button
                  key={b.id}
                  onClick={() => onNavigateToBunch(b)}
                  className={`inline-flex items-center gap-1.5 rounded-full border ${classes.pill} px-3 py-1 text-xs font-medium ${classes.pillText} hover:opacity-80 transition-colors whitespace-nowrap`}
                >
                  {b.bunch_name}
                  <span className="text-[0.6rem] opacity-60">{b.item_count}v</span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

export type { BunchWithCount };
