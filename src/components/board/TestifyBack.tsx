import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Share2, Flag, MessageCircle,
  ChevronDown, Loader2, Sparkles, SendHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TestimonyEnrichModal } from "./TestimonyEnrichModal";
import { FormattedText } from "@/lib/FormattedText";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Testimony {
  id: string;
  prayer_id: string;
  user_id: string;
  body: string;
  title: string | null;
  verses: any[];
  praise_count: number;
  flagged: boolean;
  created_at: string;
  profiles?: Profile | null;
  user_praised?: boolean;
  user_flagged?: boolean;
  comments?: TestimonyComment[];
  comments_count?: number;
}

interface TestimonyComment {
  id: string;
  testimony_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Profile | null;
}

interface TestifyBackProps {
  prayerId: string;
  prayerAuthorId: string | null | undefined;
  onFlipBack: () => void;
  accentColor?: string;
  textColor?: string;
  cardBg?: string;
}

function Avatar({ profile, size = 7 }: { profile?: Profile | null; size?: number }) {
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const sizeClass = size === 7 ? "w-7 h-7 text-xs" : "w-5 h-5 text-[10px]";
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || "User"}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "hsl(42 75% 55%)", color: "white" }}>
      {initials}
    </div>
  );
}

export function TestifyBack({ prayerId, prayerAuthorId, onFlipBack, accentColor = "hsl(42 75% 40%)", textColor = "hsl(25 35% 14%)", cardBg = "hsl(var(--card))" }: TestifyBackProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loadingTestimonies, setLoadingTestimonies] = useState(true);
  const [body, setBody] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [enrichModalOpen, setEnrichModalOpen] = useState(false);

  const MAX_CHARS = 4000;
  const subtleText = `${textColor}70`;

  const fetchTestimonies = async () => {
    setLoadingTestimonies(true);
    try {
      const { data: testimonyData } = await supabase
        .from("testimonies")
        .select("*, profiles(id, full_name, avatar_url)")
        .eq("prayer_id", prayerId)
        .order("created_at", { ascending: true });

      if (!testimonyData) { setLoadingTestimonies(false); return; }

      const ids = testimonyData.map(t => t.id);
      const [{ data: praisesData }, { data: flagsData }, { data: commentsCountData }] = await Promise.all([
        ids.length ? supabase.from("testimony_praises").select("testimony_id, user_id").in("testimony_id", ids) : { data: [] },
        user && ids.length ? supabase.from("testimony_flags").select("testimony_id").in("testimony_id", ids).eq("user_id", user.id) : { data: [] },
        ids.length ? supabase.from("testimony_comments").select("testimony_id").in("testimony_id", ids) : { data: [] },
      ]);

      const praiseMap: Record<string, number> = {};
      const userPraisedSet = new Set<string>();
      (praisesData || []).forEach((p: any) => {
        praiseMap[p.testimony_id] = (praiseMap[p.testimony_id] || 0) + 1;
        if (p.user_id === user?.id) userPraisedSet.add(p.testimony_id);
      });

      const userFlaggedSet = new Set((flagsData || []).map((f: any) => f.testimony_id));

      const commentsCountMap: Record<string, number> = {};
      (commentsCountData || []).forEach((c: any) => {
        commentsCountMap[c.testimony_id] = (commentsCountMap[c.testimony_id] || 0) + 1;
      });

      const enriched: Testimony[] = testimonyData.map(t => ({
        ...t,
        title: (t as any).title || null,
        verses: Array.isArray((t as any).verses) ? (t as any).verses : [],
        praise_count: (t as any).praise_count || praiseMap[t.id] || 0,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
        user_praised: userPraisedSet.has(t.id),
        user_flagged: userFlaggedSet.has(t.id),
        comments_count: commentsCountMap[t.id] || 0,
      }));

      enriched.sort((a, b) => {
        const aIsAuthor = a.user_id === prayerAuthorId ? -1 : 0;
        const bIsAuthor = b.user_id === prayerAuthorId ? -1 : 0;
        if (aIsAuthor !== bIsAuthor) return aIsAuthor - bIsAuthor;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setTestimonies(enriched);
    } finally {
      setLoadingTestimonies(false);
    }
  };

  useEffect(() => { fetchTestimonies(); }, [prayerId, user?.id]);

  const togglePraise = async (testimony: Testimony) => {
    if (!user) { toast({ title: "Sign in to praise 🙏" }); return; }
    if (testimony.user_praised) {
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    }
    setTestimonies(prev => prev.map(t => t.id === testimony.id ? {
      ...t,
      user_praised: !t.user_praised,
      praise_count: (t.praise_count || 0) + (t.user_praised ? -1 : 1),
    } : t));
  };

  const handleShare = (testimony: Testimony) => {
    const url = `${window.location.origin}/testimony/${testimony.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Testimony link copied! 🔗" }));
  };

  const handleFlag = async (testimony: Testimony) => {
    if (!user) { toast({ title: "Sign in to flag content" }); return; }
    if (testimony.user_flagged) return;
    await supabase.from("testimony_flags").insert({ testimony_id: testimony.id, user_id: user.id });
    setTestimonies(prev => prev.map(t => t.id === testimony.id ? { ...t, user_flagged: true } : t));
    toast({ title: "Flagged for review. Thank you." });
  };

  const fetchComments = async (testimonyId: string) => {
    const { data: commentsData } = await supabase
      .from("testimony_comments")
      .select("id, testimony_id, user_id, body, created_at")
      .eq("testimony_id", testimonyId)
      .order("created_at", { ascending: true });
    if (!commentsData) return;
    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    const { data: profilesData } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : { data: [] };
    const profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    const comments: TestimonyComment[] = commentsData.map(c => ({ ...c, profiles: profilesMap[c.user_id] || null }));
    setTestimonies(prev => prev.map(t => t.id === testimonyId ? { ...t, comments } : t));
  };

  const submitComment = async (testimonyId: string) => {
    if (!user) { toast({ title: "Sign in to comment" }); return; }
    const commentBody = commentInputs[testimonyId]?.trim();
    if (!commentBody || commentBody.length < 2) return;
    setSubmittingComment(testimonyId);
    try {
      await supabase.from("testimony_comments").insert({ testimony_id: testimonyId, user_id: user.id, body: commentBody });
      setCommentInputs(prev => ({ ...prev, [testimonyId]: "" }));
      fetchComments(testimonyId);
    } finally {
      setSubmittingComment(null);
    }
  };

  const toggleComments = async (testimonyId: string) => {
    const nowShowing = !showComments[testimonyId];
    setShowComments(prev => ({ ...prev, [testimonyId]: nowShowing }));
    if (nowShowing) fetchComments(testimonyId);
  };

  const alreadyTestified = user && testimonies.some(t => t.user_id === user.id);

  const handleShareClick = () => {
    if (!user) { toast({ title: "Sign in to testify 🙏" }); return; }
    if (body.trim().length < 10) { toast({ title: "Please write a bit more about your testimony." }); return; }
    setEnrichModalOpen(true);
  };

  return (
    <div
      className="relative flex flex-col h-full overflow-y-auto overscroll-contain"
      style={{ background: cardBg, color: textColor }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 border-b text-center"
        style={{ background: `${cardBg}f5`, borderColor: `${textColor}12`, backdropFilter: "blur(8px)" }}>
        <p className="font-display font-bold text-sm" style={{ color: accentColor }}>
          Did God answer your prayer? Testify! 🕊️
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Submit form */}
        {!alreadyTestified && (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Share how God answered this prayer… Your story matters and will encourage others!"
              className="w-full text-sm resize-none rounded-xl border-2 min-h-[180px] focus-visible:ring-0 flex-1"
              style={{
                borderColor: body.length > 0 ? accentColor : `${textColor}20`,
                background: `${textColor}05`,
                color: textColor,
              }}
              rows={7}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: subtleText }}>
                {body.length}/{MAX_CHARS}
              </span>
              <Button
                onClick={handleShareClick}
                disabled={body.trim().length < 10}
                size="sm"
                className="rounded-xl gap-1.5 h-8 text-xs font-semibold"
                style={{ background: accentColor, color: "white" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Share Testimony
              </Button>
            </div>
          </div>
        )}

        {alreadyTestified && (
          <div className="text-center py-2 px-3 rounded-xl text-xs font-medium"
            style={{ background: `${accentColor}15`, color: accentColor }}>
            ✓ You've shared your testimony for this prayer
          </div>
        )}

        {/* Divider */}
        {testimonies.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: `${textColor}12` }} />
            <span className="text-[10px] font-medium" style={{ color: subtleText }}>
              {testimonies.length} {testimonies.length === 1 ? "testimony" : "testimonies"}
            </span>
            <div className="h-px flex-1" style={{ background: `${textColor}12` }} />
          </div>
        )}

        {/* Testimonies list */}
        {loadingTestimonies ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: subtleText }} />
          </div>
        ) : testimonies.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-2xl">🕊️</p>
            <p className="text-xs font-medium" style={{ color: subtleText }}>
              Be the first to testify!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {testimonies.map(testimony => {
              const isAuthor = testimony.user_id === prayerAuthorId;
              const isExpanded = expandedId === testimony.id;
              const displayName = testimony.profiles?.full_name || "Anonymous";

              return (
                <div key={testimony.id} className="rounded-xl border overflow-hidden"
                  style={{ borderColor: isAuthor ? `${accentColor}40` : `${textColor}12`, background: isAuthor ? `${accentColor}08` : `${textColor}04` }}>

                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedId(isExpanded ? null : testimony.id)}
                  >
                    <Avatar profile={testimony.profiles} size={7} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate" style={{ color: textColor }}>
                          {displayName}
                        </span>
                        {isAuthor && (
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: accentColor, color: "white" }}>
                            Author
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] truncate" style={{ color: subtleText }}>
                        {testimony.title || (testimony.body.slice(0, 60) + (testimony.body.length > 60 ? "…" : ""))}
                      </p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: subtleText }} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: `${textColor}10` }}>
                          <FormattedText
                            text={testimony.body}
                            className="text-sm leading-relaxed pt-2"
                            style={{ color: `${textColor}dd` }}
                          />

                          {/* Social actions — Praise Hands replaces Heart */}
                          <div className="flex items-center gap-0.5 flex-wrap">
                            <motion.button
                              onClick={() => togglePraise(testimony)}
                              whileTap={{ scale: 1.3 }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-accent/40"
                              style={{ color: testimony.user_praised ? accentColor : subtleText }}
                            >
                              <span className="text-sm">🙌</span>
                              <span>{testimony.praise_count || 0}</span>
                            </motion.button>

                            <button
                              onClick={() => handleShare(testimony)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-accent/40"
                              style={{ color: subtleText }}
                            >
                              <Share2 className="w-3 h-3" />
                              Share
                            </button>

                            <button
                              onClick={() => toggleComments(testimony.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-accent/40"
                              style={{ color: showComments[testimony.id] ? accentColor : subtleText }}
                            >
                              <MessageCircle className="w-3 h-3" />
                              {testimony.comments_count || 0}
                            </button>

                            <div className="flex-1" />

                            {!testimony.user_flagged && testimony.user_id !== user?.id && (
                              <button
                                onClick={() => handleFlag(testimony)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-accent/40"
                                style={{ color: subtleText }}
                                title="Flag for admin review"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Comments */}
                          <AnimatePresence>
                            {showComments[testimony.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden space-y-2 pt-2 border-t"
                                style={{ borderColor: `${textColor}10` }}
                              >
                                {(testimony.comments || []).map(comment => (
                                  <div key={comment.id} className="flex gap-2">
                                    <Avatar profile={comment.profiles} size={5} />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[10px] font-semibold" style={{ color: `${textColor}bb` }}>
                                        {comment.profiles?.full_name || "Anonymous"}
                                      </span>
                                      <p className="text-xs leading-snug" style={{ color: `${textColor}99` }}>
                                        {comment.body}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                {user && (
                                  <div className="flex gap-1.5">
                                    <Input
                                      value={commentInputs[testimony.id] || ""}
                                      onChange={e => setCommentInputs(prev => ({ ...prev, [testimony.id]: e.target.value.slice(0, 500) }))}
                                      placeholder="Add a comment…"
                                      className="h-7 text-xs rounded-xl flex-1 border"
                                      style={{ borderColor: `${textColor}20`, background: `${textColor}05`, color: textColor }}
                                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(testimony.id); } }}
                                    />
                                    <button
                                      onClick={() => submitComment(testimony.id)}
                                      disabled={submittingComment === testimony.id}
                                      className="p-1.5 rounded-lg transition-colors hover:bg-accent/40"
                                      style={{ color: accentColor }}
                                    >
                                      {submittingComment === testimony.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <SendHorizontal className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back to Prayer link */}
      <div className="sticky bottom-0 z-10 px-4 py-3 border-t text-center"
        style={{ background: `${cardBg}f5`, borderColor: `${textColor}12`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={onFlipBack}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: accentColor }}
        >
          Back to Prayer
        </button>
      </div>

      {/* Enrichment Modal */}
      <TestimonyEnrichModal
        open={enrichModalOpen}
        onOpenChange={setEnrichModalOpen}
        testimonyBody={body.trim()}
        prayerId={prayerId}
        onSuccess={() => {
          setBody("");
          fetchTestimonies();
        }}
      />
    </div>
  );
}
