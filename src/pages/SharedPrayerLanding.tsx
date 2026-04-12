import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  prayer_type: string;
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
  const [showPrayer, setShowPrayer] = useState(false);

  // Record landing page view (once per share) — must be top-level hook
  const recordLandingView = useCallback(async () => {
    if (!share) return;
    if (user) {
      await supabase
        .from("prayer_shares")
        .update({ landing_viewed_at: new Date().toISOString() } as any)
        .eq("id", share.id)
        .is("landing_viewed_at", null);
    } else {
      const key = `kp_landing_viewed_${share.token || token}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, new Date().toISOString());
      }
    }
  }, [share, user, token]);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, ProfileData>>({});

  const {
    ttsLoading, ttsPlaying, playbackRate, timedPhrases, audioRef,
    toggleTts, stopTts, pauseTts, resumeTts, changePlaybackRate,
  } = useTtsPlayer({ cacheId: prayer?.id, audioUrl: prayer?.audio_url });

  // Fetch share data — re-run when auth state settles or changes
  useEffect(() => {
    if (!token || authLoading) return;
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
          .select("id, title, prayer_text, prayer_type, background_url, audio_url, extended_prayer")
          .eq("id", shareData.prayer_id)
          .single();

        if (!prayerData) {
          // If not authenticated, don't error — show the welcome landing instead with placeholder
          if (!user) {
            setPrayer({
              id: shareData.prayer_id,
              title: "A Prayer Shared With You",
              prayer_text: "Sign in to read this prayer — it was sent with love.",
              prayer_type: "personal",
              background_url: null,
              audio_url: null,
              extended_prayer: null,
            });
          } else {
            setError("This prayer is no longer available.");
            setLoading(false);
            return;
          }
        } else {
          setPrayer(prayerData as PrayerData);
        }

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
  }, [token, user, authLoading]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kp-bg-deep)" }}>
        <SacredSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--kp-bg-deep)" }}>
        <AlertTriangle className="w-12 h-12 mb-4" style={{ color: "var(--kp-gold)" }} />
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--kp-text-primary)" }}>Oops</h1>
        <p className="text-center max-w-sm mb-6" style={{ color: "var(--kp-text-muted)" }}>{error}</p>
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

  // Check if the prayer is publicly accessible (anon could read the real text)
  const isAccessible = prayer.prayer_text !== "Sign in to read this prayer — it was sent with love.";

  // ── UNAUTHENTICATED landing ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    const recipientFirstName = recipient?.full_name?.split(" ")[0] || "friend";

    const features = [
      {
        icon: <Headphones className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Listen Aloud",
        desc: "Hear this prayer spoken with a warm, human-like voice",
      },
      {
        icon: <Bookmark className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Save to Board",
        desc: "Bookmark prayers to your personal prayer board",
      },
      {
        icon: <MessageSquare className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Realtime Comments",
        desc: `Share a private, live conversation about this prayer with ${senderFirstName}`,
      },
      {
        icon: <Flame className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Prayer Streak",
        desc: "Build a daily prayer habit and watch your streak grow",
      },
      {
        icon: <Sparkles className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Auto Verses & Labels",
        desc: "Receive Scripture-rooted encouragement woven into your prayers",
      },
      {
        icon: <Shield className="w-5 h-5" style={{ color: "hsl(42 75% 50%)" }} />,
        title: "Safe & Private",
        desc: "Your prayers are visible only to you and those you choose",
      },
    ];


    // Handler for CTA
    const handleCta = () => {
      recordLandingView();
      if (isAccessible) {
        // Public prayer — fade landing, reveal prayer
        setShowPrayer(true);
      } else {
        // Private prayer — redirect to auth with return path
        sessionStorage.setItem("kp_post_login", JSON.stringify({ path: `/shared-prayer/${token}` }));
        navigate("/auth");
      }
    };

    // If showPrayer is true, fade out landing and show the full prayer
    if (showPrayer && isAccessible) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen pb-24" style={{ background: "var(--kp-bg-deep)" }}
        >
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
                  <p className="text-sm font-semibold">From {senderFirstName}</p>
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

              {/* Sign in prompt */}
              <div className="pt-3 border-t border-border text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in to save this prayer, listen aloud, and more
                </p>
                <Button
                  onClick={() => {
                    sessionStorage.setItem("kp_post_login", JSON.stringify({ path: `/shared-prayer/${token}` }));
                    navigate("/auth");
                  }}
                  className="rounded-xl h-11 px-8 font-semibold"
                  style={{
                    background: "var(--gradient-gold)",
                    color: "white",
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col">
        {/* ── Hero gradient background ── */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, var(--kp-bg-deep) 0%, var(--kp-bg-surface) 50%, var(--kp-bg-deep) 100%)" }}>
          {/* Subtle radial dot pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle, hsl(42 80% 70%) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />

          <div className="relative z-10 px-6 pt-14 pb-10 text-center">
            {/* Sender avatar */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <Avatar className="w-18 h-18 mx-auto mb-5 ring-3 ring-amber-400/30 shadow-lg shadow-amber-500/20" style={{ width: 72, height: 72 }}>
                <AvatarImage src={sender?.avatar_url || undefined} />
                <AvatarFallback className="text-xl font-bold" style={{ background: "var(--kp-bg-elevated)", color: "var(--kp-gold)" }}>
                  {senderFirstName[0]}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-2xl font-bold leading-tight mb-2"
              style={{ color: "var(--kp-text-primary)", fontFamily: "var(--kp-font-display)" }}
            >
              {senderFirstName} shared a prayer with you
            </motion.h1>

            {share.message && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm italic mb-4 max-w-xs mx-auto"
                style={{ color: "var(--kp-text-muted)" }}
              >
                "{share.message}"
              </motion.p>
            )}

            {/* Dove SVG accent */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.15, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute top-6 right-6"
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="hsl(42 80% 70%)" strokeWidth="1.2">
                <path d="M24 8c-4 0-8 4-8 10v6l-4 6v4h24v-4l-4-6v-6c0-6-4-10-8-10z" />
                <path d="M16 24h-3a3 3 0 000 6h3M32 24h3a3 3 0 010 6h-3" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* ── Prayer preview card ── */}
        <div className="px-5 -mt-5 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.5, type: "spring", stiffness: 200, damping: 24 }}
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "var(--kp-bg-card)",
              border: "1px solid var(--kp-border-gold)",
              boxShadow: "0 8px 32px -8px rgba(180,140,50,0.12)",
            }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kp-text-muted)" }}>
              {isAccessible ? (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="font-medium">Shared Prayer</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-medium">Private Prayer</span>
                </>
              )}
            </div>
            {prayer.title && prayer.title !== "A Prayer Shared With You" && (
              <h2 className="text-lg font-semibold" style={{ color: "var(--kp-text-primary)" }}>{prayer.title}</h2>
            )}
            <p className="text-sm leading-relaxed line-clamp-4" style={{ color: "var(--kp-text-body)" }}>
              {isAccessible ? prayer.prayer_text : "A heartfelt prayer has been shared with you…"}
            </p>
            <div className="pt-2 border-t text-[11px]" style={{ borderColor: "var(--kp-border)", color: "var(--kp-text-muted)" }}>
              <BookOpen className="w-3 h-3 inline mr-1" />
              {isAccessible ? "Tap below to read the full prayer" : "Sign in to read the full prayer"}
            </div>
          </motion.div>
        </div>

        {/* ── Feature showcase ── */}
        <div className="px-5 py-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs font-semibold uppercase tracking-widest text-center mb-5"
            style={{ color: "var(--kp-gold)" }}
          >
            What you can do on KeepPray.ing
          </motion.p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.08, duration: 0.4 }}
                className="rounded-xl p-3.5 space-y-2"
                style={{
                  background: "var(--kp-bg-elevated)",
                  border: "1px solid var(--kp-border)",
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(180,140,50,0.12)" }}>
                  {feat.icon}
                </div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--kp-text-primary)" }}>{feat.title}</h3>
                <p className="text-[11px] leading-snug" style={{ color: "var(--kp-text-muted)" }}>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Scripture verse ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="px-8 pb-6 text-center"
        >
          <p className="text-xs italic" style={{ color: "var(--kp-text-muted)" }}>
            "The prayer of a righteous person is powerful and effective."
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--kp-text-muted)" }}>
            — James 5:16
          </p>
        </motion.div>

        {/* Spacer for sticky button */}
        <div className="flex-1 min-h-[80px]" />

        {/* ── Sticky CTA ── */}
        <div className="sticky bottom-0 z-20 px-5 pb-5 pt-3" style={{ background: "linear-gradient(to top, var(--kp-bg-deep) 70%, transparent)" }}>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            onClick={handleCta}
            className="w-full h-13 rounded-2xl font-semibold text-base shadow-lg flex items-center justify-center gap-2"
            style={{
              height: 52,
              background: "var(--gradient-gold)",
              color: "white",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            {isAccessible ? (
              <>
                <BookOpen className="w-5 h-5" />
                See Prayer
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In to See Your Prayer
              </>
            )}
          </motion.button>
          <p className="text-center text-[11px] mt-2" style={{ color: "var(--kp-text-muted)" }}>
            Free account — no credit card needed
          </p>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED — wrong recipient ─────────────────────────────────────────
  if (share.recipient_id && share.recipient_id !== user.id && share.sender_id !== user.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--kp-bg-deep)" }}>
        <Lock className="w-12 h-12 mb-4" style={{ color: "var(--kp-gold)" }} />
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--kp-text-primary)" }}>Not for you</h1>
        <p className="text-center max-w-sm mb-6" style={{ color: "var(--kp-text-muted)" }}>
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
    <div className="min-h-screen pb-24" style={{ background: "var(--kp-bg-deep)" }}>
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
            <PrayedButton prayerId={prayer.id} userId={user?.id} initialCount={0} size="md" />

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
