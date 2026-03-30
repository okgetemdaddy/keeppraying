import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SacredSpinner from "@/components/SacredSpinner";
import { PrayedButton } from "@/components/PrayedButton";
import {
  Volume2, Bookmark, MessageSquare, Send, LogIn, Heart,
  Loader2, Clock, AlertTriangle, Lock, Flame, Headphones,
  Shield, Sparkles, BookOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ShareData {
  id: string;
  prayer_id: string;
  sender_id: string;
  recipient_id: string | null;
  token: string;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface PrayerData {
  id: string;
  title: string | null;
  prayer_text: string;
  background_url: string | null;
  audio_url: string | null;
  extended_prayer: string | null;
}

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  share_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export default function SharedPrayerLanding() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<ShareData | null>(null);
  const [prayer, setPrayer] = useState<PrayerData | null>(null);
  const [sender, setSender] = useState<ProfileData | null>(null);
  const [recipient, setRecipient] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ttsOverlayOpen, setTtsOverlayOpen] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, ProfileData>>({});

  const {
    ttsLoading, ttsPlaying, playbackRate, timedPhrases, audioRef,
    toggleTts, stopTts, pauseTts, resumeTts, changePlaybackRate,
  } = useTtsPlayer({ cacheId: prayer?.id, audioUrl: prayer?.audio_url });

  // Fetch share data
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const { data: shares, error: shareErr } = await supabase
          .from("prayer_shares")
          .select("*")
          .eq("token", token)
          .limit(1);

        if (shareErr) throw shareErr;
        if (!shares || shares.length === 0) {
          setError("This prayer link is invalid or has expired.");
          setLoading(false);
          return;
        }

        const shareData = shares[0] as unknown as ShareData;
        if (new Date(shareData.expires_at) < new Date()) {
          setError("This prayer share has expired.");
          setLoading(false);
          return;
        }

        setShare(shareData);

        // Fetch prayer
        const { data: prayerData } = await supabase
          .from("prayer_cards")
          .select("id, title, prayer_text, background_url, audio_url, extended_prayer")
          .eq("id", shareData.prayer_id)
          .single();

        if (!prayerData) {
          setError("This prayer is no longer available.");
          setLoading(false);
          return;
        }
        setPrayer(prayerData as PrayerData);

        // Fetch sender profile
        const { data: senderData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", shareData.sender_id)
          .single();
        if (senderData) setSender(senderData as ProfileData);

        // Fetch recipient profile if exists
        if (shareData.recipient_id) {
          const { data: recipientData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", shareData.recipient_id)
            .single();
          if (recipientData) setRecipient(recipientData as ProfileData);
        }
      } catch {
        setError("Something went wrong loading this prayer.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Claim share if user is logged in and share has no recipient
  useEffect(() => {
    if (!user || !share || share.sender_id === user.id) return;
    if (share.recipient_id && share.recipient_id !== user.id) return;

    if (!share.recipient_id) {
      // Claim it
      supabase
        .from("prayer_shares")
        .update({ recipient_id: user.id, status: "viewed" } as any)
        .eq("id", share.id)
        .then(() => {
          setShare(prev => prev ? { ...prev, recipient_id: user.id, status: "viewed" } : prev);
        });
    } else if (share.status === "pending") {
      // Mark as viewed
      supabase
        .from("prayer_shares")
        .update({ status: "viewed" } as any)
        .eq("id", share.id)
        .then(() => {
          setShare(prev => prev ? { ...prev, status: "viewed" } : prev);
        });
    }
  }, [user, share]);

  // Load comments
  useEffect(() => {
    if (!share || !user) return;
    const isParticipant = user.id === share.sender_id || user.id === share.recipient_id;
    if (!isParticipant) return;

    const fetchComments = async () => {
      const { data } = await supabase
        .from("prayer_share_comments")
        .select("*")
        .eq("share_id", share.id)
        .order("created_at", { ascending: true });
      if (data) {
        setComments(data as unknown as Comment[]);
        // Fetch profiles for commenters
        const ids = [...new Set((data as any[]).map(c => c.user_id))];
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", ids);
          if (profiles) {
            const map: Record<string, ProfileData> = {};
            (profiles as ProfileData[]).forEach(p => { map[p.id] = p; });
            setCommentProfiles(map);
          }
        }
      }
    };
    fetchComments();

    // Realtime subscription
    const channel = supabase
      .channel(`share-comments-${share.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "prayer_share_comments",
        filter: `share_id=eq.${share.id}`,
      }, (payload) => {
        const newComment = payload.new as unknown as Comment;
        setComments(prev => [...prev, newComment]);
        // Fetch profile if new
        if (!commentProfiles[newComment.user_id]) {
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", newComment.user_id)
            .single()
            .then(({ data }) => {
              if (data) setCommentProfiles(prev => ({ ...prev, [(data as ProfileData).id]: data as ProfileData }));
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [share, user]);

  // Save to board
  const saveToBoard = useCallback(async () => {
    if (!user || !prayer || !share) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_saved_prayers").insert({
        user_id: user.id,
        prayer_id: prayer.id,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already on your board", description: "This prayer is already saved." });
        } else throw error;
      } else {
        toast({ title: "Prayer saved to your board 📖" });
        // Update share status
        await supabase
          .from("prayer_shares")
          .update({ status: "saved" } as any)
          .eq("id", share.id);
        setShare(prev => prev ? { ...prev, status: "saved" } : prev);
      }
      setSaved(true);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, prayer, share, toast]);

  // Send comment
  const sendComment = useCallback(async () => {
    if (!user || !share || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await supabase.from("prayer_share_comments").insert({
        share_id: share.id,
        user_id: user.id,
        text: commentText.trim(),
      } as any);
      setCommentText("");
    } catch {
      toast({ title: "Failed to send comment", variant: "destructive" });
    } finally {
      setSendingComment(false);
    }
  }, [user, share, commentText, toast]);

  const handleListen = useCallback(() => {
    if (!prayer) return;
    toggleTts(prayer.prayer_text, prayer.id);
    if (!ttsPlaying) setTtsOverlayOpen(true);
  }, [prayer, toggleTts, ttsPlaying]);

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <SacredSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-white">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">Oops</h1>
        <p className="text-muted-foreground text-center max-w-sm mb-6">{error}</p>
        <Button onClick={() => navigate("/")} className="rounded-xl">
          Go Home
        </Button>
      </div>
    );
  }

  if (!share || !prayer) return null;

  const senderFirstName = sender?.full_name?.split(" ")[0] || "Someone";
  const isAuthenticated = !!user;
  const isParticipant = user && (user.id === share.sender_id || user.id === share.recipient_id);
  const isSender = user && user.id === share.sender_id;

  // ── UNAUTHENTICATED landing ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    const recipientFirstName = recipient?.full_name?.split(" ")[0] || "friend";
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        {prayer.background_url ? (
          <div className="absolute inset-0">
            <img src={prayer.background_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900 via-amber-800 to-stone-900" />
        )}

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white text-center">
          {/* Sender avatar */}
          <Avatar className="w-16 h-16 mb-4 ring-2 ring-white/30">
            <AvatarImage src={sender?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
              {senderFirstName[0]}
            </AvatarFallback>
          </Avatar>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold leading-tight mb-2"
          >
            {senderFirstName} shared a prayer with you
          </motion.h1>

          {share.message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-white/70 italic mb-6 max-w-xs"
            >
              "{share.message}"
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-sm space-y-4 mb-8"
          >
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 space-y-3 text-left">
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <Lock className="w-3 h-3" /> Private Prayer
              </div>
              {prayer.title && (
                <h2 className="text-lg font-semibold text-white">{prayer.title}</h2>
              )}
              <p className="text-sm text-white/80 leading-relaxed line-clamp-4">
                {prayer.prayer_text}
              </p>
              <div className="pt-2 border-t border-white/10 text-[11px] text-white/40">
                Sign in to read the full prayer
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4 w-full max-w-sm"
          >
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Press <strong className="text-white">Speak</strong> to hear the prayer read aloud</span>
              </div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span><strong className="text-white">Bookmark</strong> to save to your board</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Share <strong className="text-white">comments</strong> with {senderFirstName}</span>
              </div>
            </div>

            <p className="text-xs text-white/50 mt-4">
              And much more — just sign in, {recipientFirstName} 🙏
            </p>

            <Link to={`/auth?redirect=/shared-prayer/${token}`}>
              <Button className="w-full h-12 rounded-2xl font-semibold text-base bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In to See Your Prayer
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED — wrong recipient ─────────────────────────────────────────
  if (share.recipient_id && share.recipient_id !== user.id && share.sender_id !== user.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-white">
        <Lock className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">Not for you</h1>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          This prayer was shared with someone else. Ask them to share it with you directly.
        </p>
        <Button onClick={() => navigate("/")} className="rounded-xl">Go Home</Button>
      </div>
    );
  }

  // ── AUTHENTICATED — full experience ─────────────────────────────────────────
  const otherParticipantName = isSender
    ? (recipient?.full_name?.split(" ")[0] || "recipient")
    : senderFirstName;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {prayer.background_url ? (
          <div className="absolute inset-0">
            <img src={prayer.background_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-amber-800 to-stone-800" />
        )}

        <div className="relative z-10 px-5 pt-12 pb-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10 ring-2 ring-white/20">
              <AvatarImage src={sender?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                {senderFirstName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{isSender ? "You shared this prayer" : `From ${senderFirstName}`}</p>
              <p className="text-xs text-white/60">
                {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {share.message && (
            <p className="text-sm text-white/70 italic mb-3">"{share.message}"</p>
          )}

          {prayer.title && (
            <h1 className="text-xl font-bold mb-2">{prayer.title}</h1>
          )}
        </div>
      </div>

      {/* Prayer content */}
      <div className="px-5 -mt-4 relative z-10">
        <div className="rounded-2xl bg-card border border-border shadow-lg p-5 space-y-4">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {prayer.prayer_text}
          </p>

          {prayer.extended_prayer && (
            <p className="text-xs italic text-muted-foreground leading-relaxed border-t border-border pt-3">
              {prayer.extended_prayer}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              onClick={handleListen}
              disabled={ttsLoading}
              variant="outline"
              size="sm"
              className="rounded-xl flex-1 h-10"
            >
              {ttsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Volume2 className="w-4 h-4 mr-1.5" style={ttsPlaying ? { color: "hsl(42 75% 40%)" } : undefined} />
              )}
              {ttsPlaying ? "Playing…" : "Listen"}
            </Button>

            {!isSender && (
              <Button
                onClick={saveToBoard}
                disabled={saving || saved}
                variant={saved ? "outline" : "default"}
                size="sm"
                className="rounded-xl flex-1 h-10"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : saved ? (
                  <Heart className="w-4 h-4 mr-1.5 fill-current text-green-600" />
                ) : (
                  <Bookmark className="w-4 h-4 mr-1.5" />
                )}
                {saved ? "Saved" : "Save to Board"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Private comments */}
      {isParticipant && (
        <div className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Private conversation with {otherParticipantName}
          </h2>

          <div className="space-y-2 max-h-80 overflow-y-auto mb-3">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No messages yet. Start the conversation 🙏
              </p>
            )}
            {comments.map(c => {
              const isMe = c.user_id === user.id;
              const profile = commentProfiles[c.user_id];
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                      {(profile?.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted text-foreground rounded-tl-md"
                  }`}>
                    <p className="leading-relaxed">{c.text}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Comment input */}
          <div className="flex items-end gap-2">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={`Message ${otherParticipantName}…`}
              rows={1}
              maxLength={500}
              className="flex-1 rounded-xl resize-none min-h-[40px] text-sm"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
            />
            <Button
              onClick={sendComment}
              disabled={sendingComment || !commentText.trim()}
              size="sm"
              className="rounded-xl h-10 w-10 p-0"
            >
              {sendingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* TTS Overlay */}
      <TtsContemplationOverlay
        playing={ttsPlaying && ttsOverlayOpen}
        onStop={() => { stopTts(); setTtsOverlayOpen(false); }}
        onPause={pauseTts}
        onResume={resumeTts}
        text={prayer.prayer_text}
        playbackRate={playbackRate}
        onPlaybackRateChange={changePlaybackRate}
        timedPhrases={timedPhrases}
        audioRef={audioRef}
      />
    </div>
  );
}
