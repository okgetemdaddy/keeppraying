import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, RefreshCw, Youtube, Crown, BookOpen } from "lucide-react";

interface TranscriptRow {
  id: string;
  video_id: string;
  video_title: string | null;
  fetched_at: string;
  analysis_result: unknown;
  premium_result: unknown;
  user_id: string | null;
}

export default function SermonCacheTab() {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sermon_transcripts")
      .select("id, video_id, video_title, fetched_at, analysis_result, premium_result, user_id")
      .order("fetched_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load sermon cache", description: error.message, variant: "destructive" });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.video_title?.toLowerCase().includes(q)) ||
      r.video_id.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string, videoTitle: string | null) => {
    setDeleting(id);
    const { error } = await supabase.from("sermon_transcripts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Cache cleared", description: `Removed "${videoTitle || "Untitled"}" from sermon cache.` });
    }
    setDeleting(null);
  };

  const handleClearField = async (id: string, field: "analysis_result" | "premium_result", videoTitle: string | null) => {
    setDeleting(id);
    const { error } = await supabase
      .from("sermon_transcripts")
      .update({ [field]: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: null } : r))
      );
      const label = field === "premium_result" ? "Premium" : "Standard";
      toast({ title: `${label} analysis cleared`, description: `"${videoTitle || "Untitled"}" will re-analyze on next sync.` });
    }
    setDeleting(null);
  };

  const handleClearAll = async () => {
    if (!confirm("Delete ALL cached sermon transcripts? Users will need to re-sync their sermons.")) return;
    setClearingAll(true);
    let deleted = 0;
    for (const row of rows) {
      const { error } = await supabase.from("sermon_transcripts").delete().eq("id", row.id);
      if (!error) deleted++;
    }
    toast({ title: "Sermon cache cleared", description: `Removed ${deleted} cached transcript(s).` });
    await load();
    setClearingAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-400" />
            Sermon Sync Cache
          </h2>
          <p className="text-amber-200/60 text-sm mt-1">
            {rows.length} cached transcript{rows.length !== 1 ? "s" : ""} •
            {rows.filter((r) => r.premium_result).length} premium •
            {rows.filter((r) => r.analysis_result).length} standard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="border-amber-700/50 text-amber-200 hover:bg-amber-900/30"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {rows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={clearingAll}
            >
              {clearingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
        <Input
          placeholder="Search by title or video ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-navy-900/50 border-amber-700/30 text-amber-100 placeholder:text-amber-200/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-amber-200/50">
          {search ? "No matching transcripts found." : "No cached sermon transcripts."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="bg-navy-800/50 border border-amber-700/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-amber-100 font-medium truncate">
                  {row.video_title || "Untitled Sermon"}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-amber-200/40 font-mono">{row.video_id}</span>
                  <span className="text-xs text-amber-200/40">
                    {new Date(row.fetched_at).toLocaleDateString()}
                  </span>
                  {row.analysis_result && (
                    <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-300">
                      <BookOpen className="w-3 h-3 mr-1" /> Standard
                    </Badge>
                  )}
                  {row.premium_result && (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-300">
                      <Crown className="w-3 h-3 mr-1" /> Premium
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {row.analysis_result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearField(row.id, "analysis_result", row.video_title)}
                    disabled={deleting === row.id}
                    className="border-blue-600/40 text-blue-300 hover:bg-blue-900/30 text-xs"
                  >
                    Clear Standard
                  </Button>
                )}
                {row.premium_result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearField(row.id, "premium_result", row.video_title)}
                    disabled={deleting === row.id}
                    className="border-amber-600/40 text-amber-300 hover:bg-amber-900/30 text-xs"
                  >
                    Clear Premium
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(row.id, row.video_title)}
                  disabled={deleting === row.id}
                >
                  {deleting === row.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
