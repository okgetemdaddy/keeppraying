import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tablet, RefreshCw, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WaitlistEntry {
  id: string;
  email: string;
  platform: string;
  user_id: string | null;
  created_at: string;
}

export default function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error, count } = await (supabase as any)
      .from("waitlist_signups")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      setEntries(data);
      setTotal(count ?? data.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
            <Tablet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">KeepRead.ing Waitlist</h2>
            <p className="text-xs text-muted-foreground">Native iPadOS app signups</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {total} signup{total !== 1 ? "s" : ""}
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading && entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Tablet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No signups yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</span>
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Platform</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Registered User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Signed Up</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry, i) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{entry.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-xs capitalize">{entry.platform}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {entry.user_id ? "✓ Yes" : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {new Date(entry.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
