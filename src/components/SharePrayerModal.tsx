import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle } from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Send, Link2, Copy, Check, Loader2, MessageSquare, X, UserPlus,
} from "lucide-react";

interface SharePrayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prayerId: string;
  prayerTitle?: string | null;
}

interface UserResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function SharePrayerModal({ open, onOpenChange, prayerId, prayerTitle }: SharePrayerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null); // user id being shared to
  const [sharedTo, setSharedTo] = useState<Set<string>>(new Set());
  const [linkMode, setLinkMode] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSharedTo(new Set());
      setLinkMode(false);
      setGeneratedLink(null);
      setPersonalNote("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced user search — minimum 4 characters
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 4) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${query.trim()}%`)
        .neq("id", user?.id || "")
        .limit(8);
      setResults((data as UserResult[]) || []);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, user?.id]);

  // Share to a specific user
  const shareToUser = useCallback(async (recipient: UserResult) => {
    if (!user) return;
    setSharing(recipient.id);
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("prayer_shares")
        .select("id")
        .eq("prayer_id", prayerId)
        .eq("sender_id", user.id)
        .eq("recipient_id", recipient.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already shared", description: `This prayer has already been shared with ${recipient.full_name || "this user"}.` });
        setSharing(null);
        return;
      }

      const { error } = await supabase.from("prayer_shares").insert({
        prayer_id: prayerId,
        sender_id: user.id,
        recipient_id: recipient.id,
        message: personalNote || null,
        status: "pending",
      } as any);

      if (error) throw error;

      setSharedTo(prev => new Set(prev).add(recipient.id));
      toast({
        title: "Prayer shared 🙏",
        description: `${recipient.full_name || "User"} will see it in their notifications.`,
      });
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    } finally {
      setSharing(null);
    }
  }, [user, prayerId, personalNote, toast]);

  // Generate a shareable link (for SMS)
  const generateShareLink = useCallback(async () => {
    if (!user) return;
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase
        .from("prayer_shares")
        .insert({
          prayer_id: prayerId,
          sender_id: user.id,
          recipient_id: null,
          message: personalNote || null,
          status: "pending",
        } as any)
        .select("token")
        .single();

      if (error) throw error;
      const link = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-prayer-preview?token=${(data as any).token}`;
      setGeneratedLink(link);
    } catch {
      toast({ title: "Failed to generate link", variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  }, [user, prayerId, personalNote, toast]);

  const copyLink = useCallback(async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [generatedLink]);

  const shareViaText = useCallback(() => {
    if (!generatedLink) return;
    const text = `I'd like to share a prayer with you 🙏\n\n${generatedLink}`;
    if (navigator.share) {
      navigator.share({ title: "Shared Prayer", text, url: generatedLink }).catch(() => {});
    } else {
      // Fallback: SMS link
      window.open(`sms:?body=${encodeURIComponent(text)}`, "_blank");
    }
  }, [generatedLink]);

  const initials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Share Prayer Privately
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Toggle between search and link mode */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!linkMode ? "default" : "outline"}
              onClick={() => setLinkMode(false)}
              className="flex-1 rounded-xl text-xs h-9"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Find User
            </Button>
            <Button
              size="sm"
              variant={linkMode ? "default" : "outline"}
              onClick={() => { setLinkMode(true); if (!generatedLink) generateShareLink(); }}
              className="flex-1 rounded-xl text-xs h-9"
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Share via Text
            </Button>
          </div>

          {/* Optional personal note */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Personal note (optional)
            </label>
            <Input
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder="Praying for you…"
              maxLength={200}
              className="rounded-xl text-sm h-9"
            />
          </div>

          {!linkMode ? (
            <>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type at least 4 letters to search…"
                  className="pl-9 rounded-xl text-sm h-10"
                  maxLength={50}
                />
                {query.length > 0 && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Minimum chars hint */}
              {query.length > 0 && query.length < 4 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Type {4 - query.length} more letter{4 - query.length > 1 ? "s" : ""} to search…
                </p>
              )}

              {/* Search results */}
              <div className="space-y-1">
                {searching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                {!searching && query.length >= 4 && results.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No users found matching "{query}"
                  </p>
                )}
                <AnimatePresence>
                  {results.map(r => {
                    const alreadyShared = sharedTo.has(r.id);
                    return (
                      <motion.button
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        onClick={() => !alreadyShared && shareToUser(r)}
                        disabled={sharing === r.id || alreadyShared}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-accent/40 disabled:opacity-60"
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={r.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials(r.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm font-medium text-left truncate">
                          {r.full_name || "Unknown User"}
                        </span>
                        {sharing === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : alreadyShared ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <Check className="w-3.5 h-3.5" /> Shared
                          </span>
                        ) : (
                          <Send className="w-4 h-4 text-muted-foreground" />
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Link sharing mode */
            <div className="space-y-4 py-2">
              {generatingLink ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Generating secure link…</span>
                </div>
              ) : generatedLink ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                      {generatedLink}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyLink}
                      className="h-7 px-2 rounded-lg"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  <Button
                    onClick={shareViaText}
                    className="w-full rounded-xl h-11 font-semibold"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send via Text Message
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                    This link expires in 30 days. Only the person you share it with can save the prayer to their board.
                  </p>
                </>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
