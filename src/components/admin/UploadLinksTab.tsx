import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Link2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TokenRow {
  id: string;
  token: string;
  label: string | null;
  used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export default function UploadLinksTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");

  const loadTokens = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("upload_access_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setTokens((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const generateLink = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("upload_access_tokens")
      .insert({ label: label.trim() || null, created_by: user.id } as any)
      .select()
      .single();

    if (error || !data) {
      toast({ title: "Error", description: "Failed to generate link", variant: "destructive" });
      setCreating(false);
      return;
    }

    const url = `${window.location.origin}/upload#${(data as any).token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Single-use upload link copied to clipboard." });
    setLabel("");
    setCreating(false);
    loadTokens();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Label (e.g. 'For John's files')"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1"
          maxLength={100}
        />
        <Button onClick={generateLink} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Generate Link
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No upload links generated yet.
        </p>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {t.label || <span className="text-muted-foreground italic">No label</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()} · Expires{" "}
                  {new Date(t.expires_at).toLocaleDateString()}
                </p>
              </div>
              {t.used ? (
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Used
                </Badge>
              ) : new Date(t.expires_at) < new Date() ? (
                <Badge variant="outline" className="gap-1 shrink-0 text-muted-foreground">
                  <XCircle className="h-3 w-3" /> Expired
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const url = `${window.location.origin}/upload#${t.token}`;
                    await navigator.clipboard.writeText(url);
                    toast({ title: "Copied!", description: "Upload link copied." });
                  }}
                  className="gap-1 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
