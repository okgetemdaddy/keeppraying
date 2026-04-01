import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package } from "lucide-react";
import { getBunchColor, BUNCH_COLOR_CLASSES } from "@/components/bible/bunchColors";

interface BunchItem {
  id: string;
  book_usfm: string;
  chapter_number: number;
  verse_number: number;
  version_id: number;
}

interface BunchWithCount {
  id: string;
  bunch_name: string;
  description: string | null;
  item_count: number;
  first_book_usfm: string | null;
  first_chapter: number | null;
  first_verse: number | null;
  first_version_id: number | null;
  items: BunchItem[];
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
          items: items.map((it: any) => ({
            id: it.id,
            book_usfm: it.book_usfm,
            chapter_number: it.chapter_number,
            verse_number: it.verse_number,
            version_id: it.version_id,
          })),
        };
      });
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });
}

/* ── Short book name map ── */
const BOOK_SHORT: Record<string, string> = {
  GEN: "Gen", EXO: "Exo", LEV: "Lev", NUM: "Num", DEU: "Deu", JOS: "Jos", JDG: "Jdg", RUT: "Rut",
  "1SA": "1Sa", "2SA": "2Sa", "1KI": "1Ki", "2KI": "2Ki", "1CH": "1Ch", "2CH": "2Ch",
  EZR: "Ezr", NEH: "Neh", EST: "Est", JOB: "Job", PSA: "Ps", PRO: "Pro", ECC: "Ecc", SNG: "Sng",
  ISA: "Isa", JER: "Jer", LAM: "Lam", EZK: "Ezk", DAN: "Dan", HOS: "Hos", JOL: "Jol", AMO: "Amo",
  OBA: "Oba", JON: "Jon", MIC: "Mic", NAM: "Nah", HAB: "Hab", ZEP: "Zep", HAG: "Hag", ZEC: "Zec",
  MAL: "Mal", MAT: "Mat", MRK: "Mrk", LUK: "Luk", JHN: "Jhn", ACT: "Act", ROM: "Rom",
  "1CO": "1Co", "2CO": "2Co", GAL: "Gal", EPH: "Eph", PHP: "Php", COL: "Col",
  "1TH": "1Th", "2TH": "2Th", "1TI": "1Ti", "2TI": "2Ti", TIT: "Tit", PHM: "Phm",
  HEB: "Heb", JAS: "Jas", "1PE": "1Pe", "2PE": "2Pe", "1JN": "1Jn", "2JN": "2Jn", "3JN": "3Jn",
  JUD: "Jud", REV: "Rev",
};

function shortRef(item: BunchItem): string {
  const book = BOOK_SHORT[item.book_usfm] ?? item.book_usfm;
  return `${book} ${item.chapter_number}:${item.verse_number}`;
}

interface VerseBunchStripProps {
  onNavigateToBunch: (bunch: BunchWithCount) => void;
  onNavigateToVerse?: (versionId: number, bookUsfm: string, chapter: number, verse: number) => void;
  activeBunchId?: string | null;
}

export function VerseBunchStrip({ onNavigateToBunch, onNavigateToVerse, activeBunchId }: VerseBunchStripProps) {
  const { user } = useAuth();
  const { data: bunches } = useUserVerseBunches();

  if (!user || !bunches?.length) return null;

  const newest = bunches[0];
  const activeBunch = activeBunchId ? bunches.find((b) => b.id === activeBunchId) : null;

  // If the active bunch IS the latest bunch, show as "Active Bunch", otherwise show latest + active separately
  const isActiveLatest = activeBunchId === newest.id;
  const label = isActiveLatest || activeBunchId ? "Active Bunch" : "Latest Bunch";
  const displayBunch = isActiveLatest ? newest : newest;

  const color = getBunchColor(0);
  const classes = BUNCH_COLOR_CLASSES[color];

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-2">
        {/* Latest / Active Bunch row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Package className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="text-[0.65rem] font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
            {isActiveLatest ? "Active Bunch" : "Latest Bunch"}
          </span>
          <div className="mx-1 h-4 w-px bg-border shrink-0" />
          <button
            onClick={() => onNavigateToBunch(displayBunch)}
            className={`inline-flex items-center gap-1.5 rounded-full border ${classes.pill} px-3 py-1 text-xs font-medium ${classes.pillText} hover:opacity-80 transition-colors whitespace-nowrap opacity-80`}
          >
            {displayBunch.bunch_name}
            <span className="text-[0.6rem] opacity-60">{displayBunch.item_count}v</span>
          </button>

          {/* Verse links for displayed bunch */}
          {displayBunch.items.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {displayBunch.items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => onNavigateToVerse?.(item.version_id, item.book_usfm, item.chapter_number, item.verse_number)}
                  className="text-[0.6rem] text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {shortRef(item)}{i < displayBunch.items.length - 1 ? " ·" : ""}
                </button>
              ))}
            </div>
          )}

          {bunches.length > 1 && !activeBunch && (
            <span className="text-[0.6rem] text-muted-foreground">
              +{bunches.length - 1} more in Sleeve
            </span>
          )}
        </div>

        {/* Separate active bunch row if different from latest */}
        {activeBunch && !isActiveLatest && (
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <Package className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="text-[0.65rem] font-medium text-muted-foreground shrink-0 uppercase tracking-wider">
              Active Bunch
            </span>
            <div className="mx-1 h-4 w-px bg-border shrink-0" />
            {(() => {
              const activeIdx = bunches.findIndex((b) => b.id === activeBunchId);
              const activeColor = getBunchColor(activeIdx >= 0 ? activeIdx : 0);
              const activeClasses = BUNCH_COLOR_CLASSES[activeColor];
              return (
                <>
                  <button
                    onClick={() => onNavigateToBunch(activeBunch)}
                    className={`inline-flex items-center gap-1.5 rounded-full border ${activeClasses.pill} px-3 py-1 text-xs font-medium ${activeClasses.pillText} hover:opacity-80 transition-colors whitespace-nowrap opacity-80`}
                  >
                    {activeBunch.bunch_name}
                    <span className="text-[0.6rem] opacity-60">{activeBunch.item_count}v</span>
                  </button>
                  {activeBunch.items.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {activeBunch.items.map((item, i) => (
                        <button
                          key={item.id}
                          onClick={() => onNavigateToVerse?.(item.version_id, item.book_usfm, item.chapter_number, item.verse_number)}
                          className="text-[0.6rem] text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                        >
                          {shortRef(item)}{i < activeBunch.items.length - 1 ? " ·" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export type { BunchWithCount, BunchItem };
