import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, Eye, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SightEntry {
  id: string;
  user_id: string;
  book_usfm: string;
  chapter_number: number;
  content: string;
  lens_used: string;
  model_used: string;
  tags: string[];
  summary_line: string | null;
  is_refresh: boolean;
  created_at: string;
}

export default function BibleSightAdminTab() {
  const [entries, setEntries] = useState<SightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterLens, setFilterLens] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, gemini: 0, grok: 0 });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("bible_sight_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filterModel !== "all") {
      query = query.ilike("model_used", `%${filterModel}%`);
    }
    if (filterLens !== "all") {
      query = query.eq("lens_used", filterLens);
    }

    const { data } = await query;
    const all = (data as any[]) || [];

    // Client-side text search
    const filtered = searchQuery
      ? all.filter(
          (e) =>
            e.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.summary_line?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.tags?.some((t: string) => t.includes(searchQuery.toLowerCase())) ||
            e.book_usfm?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : all;

    setEntries(filtered);
    setStats({
      total: all.length,
      today: all.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length,
      gemini: all.filter((e) => e.model_used?.includes("gemini")).length,
      grok: all.filter((e) => e.model_used?.includes("grok")).length,
    });
    setLoading(false);
  }, [filterModel, filterLens, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const lensOptions = [
    "verse_anchor", "worry_and_peace", "fallen_nature", "daily_application",
    "original_language", "historical_context", "prayer_without_ceasing", "gratitude_and_wonder",
  ];

  return (
    <div className="space-y-4">
      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Entries", value: stats.total, color: "text-amber-400" },
          { label: "Today", value: stats.today, color: "text-green-400" },
          { label: "Gemini", value: stats.gemini, color: "text-blue-400" },
          { label: "Grok", value: stats.grok, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="bg-navy-800/50 rounded-xl border border-gold-500/10 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[0.6rem] text-gold-400/60 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gold-400/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries, tags, books..."
            className="pl-9 bg-navy-900/50 border-gold-500/20 text-gold-100 placeholder:text-gold-400/30 h-9 text-sm"
          />
        </div>
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="w-[130px] h-9 bg-navy-900/50 border-gold-500/20 text-gold-100 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="grok">Grok</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLens} onValueChange={setFilterLens}>
          <SelectTrigger className="w-[160px] h-9 bg-navy-900/50 border-gold-500/20 text-gold-100 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lenses</SelectItem>
            {lensOptions.map((l) => (
              <SelectItem key={l} value={l}>
                {l.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries List */}
      <ScrollArea className="h-[calc(100vh-360px)]">
        {loading ? (
          <div className="text-center py-12 text-gold-400/40">Loading Bible Sight entries...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 mx-auto text-gold-500/20 mb-3" />
            <p className="text-sm text-gold-400/60">No entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gold-500/10 bg-navy-800/30 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-navy-700/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gold-100">
                          {entry.book_usfm} {entry.chapter_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[0.55rem] px-1.5 py-0 ${
                            entry.model_used.includes("grok")
                              ? "border-purple-500/30 text-purple-400"
                              : "border-blue-500/30 text-blue-400"
                          }`}
                        >
                          {entry.model_used.includes("grok") ? "Grok" : "Gemini"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[0.55rem] px-1.5 py-0 border-amber-500/20 text-amber-400/70"
                        >
                          {entry.lens_used.replace(/_/g, " ")}
                        </Badge>
                        {entry.is_refresh && (
                          <Badge variant="outline" className="text-[0.55rem] px-1.5 py-0 border-green-500/20 text-green-400/70">
                            refresh
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gold-400/50 truncate">
                        {entry.summary_line || entry.content.slice(0, 80) + "..."}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[0.6rem] text-gold-400/40">
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-gold-400/30 mt-1" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-gold-400/30 mt-1" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gold-500/10">
                      <div className="flex flex-wrap gap-1 mt-3 mb-2">
                        {entry.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[0.55rem] bg-amber-500/10 text-amber-400 border-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gold-100/80 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                        {entry.content}
                      </p>
                      <p className="text-[0.55rem] text-gold-400/30 mt-2">
                        User: {entry.user_id.slice(0, 8)}... · {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
