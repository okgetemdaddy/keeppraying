import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Play, Pause, Search, RefreshCw, Download, Volume2, FileAudio, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CacheEntry {
  cacheId: string;
  mp3Name: string | null;
  jsonName: string | null;
  mp3Size: number;
  jsonSize: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function AudioCacheTab() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const allFiles: { name: string; created_at: string; metadata: { size?: number } | null }[] = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const { data, error } = await supabase.storage.from("prayer-audio").list("", {
          limit,
          offset,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (error) throw error;
        if (!data || data.length === 0) break;
        allFiles.push(...(data as any[]));
        if (data.length < limit) break;
        offset += limit;
      }

      // Group by cache ID
      const map = new Map<string, CacheEntry>();
      for (const f of allFiles) {
        if (!f.name || f.name.startsWith(".")) continue;
        const isJson = f.name.endsWith("_phrases.json");
        const isMp3 = f.name.endsWith(".mp3");
        if (!isJson && !isMp3) continue;

        const cacheId = isJson
          ? f.name.replace("_phrases.json", "")
          : f.name.replace(".mp3", "");

        const existing = map.get(cacheId) || {
          cacheId,
          mp3Name: null,
          jsonName: null,
          mp3Size: 0,
          jsonSize: 0,
          createdAt: f.created_at,
        };

        if (isMp3) {
          existing.mp3Name = f.name;
          existing.mp3Size = f.metadata?.size || 0;
        } else {
          existing.jsonName = f.name;
          existing.jsonSize = f.metadata?.size || 0;
        }

        if (f.created_at < existing.createdAt) {
          existing.createdAt = f.created_at;
        }

        map.set(cacheId, existing);
      }

      setEntries(Array.from(map.values()));
    } catch (e) {
      toast({ title: "Failed to load audio cache", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const deleteEntry = async (entry: CacheEntry) => {
    setDeleting(entry.cacheId);
    try {
      const paths: string[] = [];
      if (entry.mp3Name) paths.push(entry.mp3Name);
      if (entry.jsonName) paths.push(entry.jsonName);
      if (paths.length === 0) return;

      const { error } = await supabase.storage.from("prayer-audio").remove(paths);
      if (error) throw error;

      if (playingId === entry.cacheId) {
        audioRef.current?.pause();
        setPlayingId(null);
      }

      setEntries(prev => prev.filter(e => e.cacheId !== entry.cacheId));
      toast({ title: "Cache entry deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const deleteAll = async () => {
    setBulkDeleting(true);
    try {
      const allPaths: string[] = [];
      for (const e of entries) {
        if (e.mp3Name) allPaths.push(e.mp3Name);
        if (e.jsonName) allPaths.push(e.jsonName);
      }
      if (allPaths.length === 0) return;

      // Delete in batches of 100
      for (let i = 0; i < allPaths.length; i += 100) {
        const batch = allPaths.slice(i, i + 100);
        const { error } = await supabase.storage.from("prayer-audio").remove(batch);
        if (error) throw error;
      }

      audioRef.current?.pause();
      setPlayingId(null);
      setEntries([]);
      toast({ title: "All cache cleared 🗑️" });
    } catch (e) {
      toast({ title: "Bulk delete failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const togglePlay = (entry: CacheEntry) => {
    if (!entry.mp3Name) return;

    if (playingId === entry.cacheId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    const { data } = supabase.storage.from("prayer-audio").getPublicUrl(entry.mp3Name);
    if (!data?.publicUrl) return;

    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(data.publicUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play();
    setPlayingId(entry.cacheId);
  };

  const filtered = search.trim()
    ? entries.filter(e => e.cacheId.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const totalSize = entries.reduce((s, e) => s + e.mp3Size + e.jsonSize, 0);

  const labelStyle = { color: "hsl(38 14% 55%)" };
  const valueStyle = { color: "hsl(38 28% 92%)" };
  const cardBg = "hsl(220 30% 9%)";
  const borderClr = "hsl(220 26% 15%)";

  return (
    <div className="space-y-6">
      {/* Header metrics */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: "Cached entries", value: entries.length.toString() },
          { label: "Total storage", value: formatBytes(totalSize) },
          { label: "MP3 files", value: entries.filter(e => e.mp3Name).length.toString() },
          { label: "Caption files", value: entries.filter(e => e.jsonName).length.toString() },
        ].map(m => (
          <div key={m.label} className="rounded-xl px-5 py-3 border" style={{ background: cardBg, borderColor: borderClr }}>
            <p className="text-[10px] uppercase tracking-wider font-medium" style={labelStyle}>{m.label}</p>
            <p className="text-lg font-bold mt-0.5" style={valueStyle}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={labelStyle} />
          <Input
            placeholder="Search by cache ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border"
            style={{ background: cardBg, borderColor: borderClr, color: "hsl(38 28% 92%)" }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}
          style={{ borderColor: borderClr, color: "hsl(38 28% 92%)" }}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        {entries.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                Delete All ({entries.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear entire audio cache?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {entries.length} cached TTS entries ({formatBytes(totalSize)}).
                  Users will need to regenerate audio when they next listen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(42 85% 46%)" }} />
          <span className="ml-3 text-sm" style={labelStyle}>Loading audio cache…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: cardBg, borderColor: borderClr }}>
          <Volume2 className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(220 16% 28%)" }} />
          <p className="text-sm font-medium" style={labelStyle}>
            {search ? "No matching cache entries" : "No cached audio files yet"}
          </p>
          <p className="text-xs mt-1" style={{ color: "hsl(220 16% 35%)" }}>
            Audio is cached automatically when users listen to prayers or testimonies
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: cardBg, borderColor: borderClr }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: borderClr }}>
                <TableHead style={labelStyle} className="text-xs">Cache ID</TableHead>
                <TableHead style={labelStyle} className="text-xs">Files</TableHead>
                <TableHead style={labelStyle} className="text-xs">Size</TableHead>
                <TableHead style={labelStyle} className="text-xs">Created</TableHead>
                <TableHead style={labelStyle} className="text-xs w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.cacheId} style={{ borderColor: borderClr }}
                  className="hover:bg-white/[0.02]">
                  <TableCell className="font-mono text-xs" style={valueStyle}>
                    {entry.cacheId}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {entry.mp3Name && (
                        <Badge variant="secondary" className="text-[10px] gap-1 py-0.5"
                          style={{ background: "hsl(42 85% 46% / 0.15)", color: "hsl(42 85% 58%)", border: "none" }}>
                          <FileAudio className="w-3 h-3" /> MP3
                        </Badge>
                      )}
                      {entry.jsonName && (
                        <Badge variant="secondary" className="text-[10px] gap-1 py-0.5"
                          style={{ background: "hsl(200 60% 40% / 0.15)", color: "hsl(200 60% 60%)", border: "none" }}>
                          <FileText className="w-3 h-3" /> JSON
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs" style={labelStyle}>
                    {formatBytes(entry.mp3Size + entry.jsonSize)}
                  </TableCell>
                  <TableCell className="text-xs" style={labelStyle}>
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {entry.mp3Name && (
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => togglePlay(entry)}
                          title={playingId === entry.cacheId ? "Stop" : "Preview"}>
                          {playingId === entry.cacheId
                            ? <Pause className="w-3.5 h-3.5" style={{ color: "hsl(42 85% 58%)" }} />
                            : <Play className="w-3.5 h-3.5" style={{ color: "hsl(38 28% 92%)" }} />
                          }
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => deleteEntry(entry)}
                        disabled={deleting === entry.cacheId}
                        title="Delete cache entry">
                        {deleting === entry.cacheId
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        }
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
