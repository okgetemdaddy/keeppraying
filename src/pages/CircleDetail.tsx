import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import VerseLink from "@/components/VerseLink";
import SacredSpinner from "@/components/SacredSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCircleDetail } from "@/hooks/useAccountabilityCircles";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddPrayerModal from "@/components/AddPrayerModal";
import PrayerCompanions from "@/components/companions/PrayerCompanions";
import InviteShareModal from "@/components/InviteShareModal";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, Users, Heart, Flame, Sparkles, Loader2,
  Share2, LogOut, Trash2, Shield, BookOpen, Calendar, Plus,
  PlusCircle, Check, Crown, ClipboardList, Globe, Lock,
  ArrowUpDown, UserMinus, CheckCircle2, Clock, FileText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type SortMode = "newest" | "oldest" | "most-prayed";

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { circle, members, prayers, encouragements, homework, submissions, loading, stats, refetch } = useCircleDetail(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [encourageLoading, setEncourageLoading] = useState(false);
  const [selectedPrayerId, setSelectedPrayerId] = useState("");
  const [userPrayers, setUserPrayers] = useState<{ id: string; title: string | null; prayer_text: string }[]>([]);
  const [sharePrayerOpen, setSharePrayerOpen] = useState(false);
  const [sharingPrayer, setSharingPrayer] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [membersOpen, setMembersOpen] = useState(false);

  // Homework state
  const [hwOpen, setHwOpen] = useState(false);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwType, setHwType] = useState("custom");
  const [hwDue, setHwDue] = useState("");
  const [hwSaving, setHwSaving] = useState(false);

  // Submit homework state
  const [submitHwId, setSubmitHwId] = useState<string | null>(null);
  const [submitContent, setSubmitContent] = useState("");
  const [submittingHw, setSubmittingHw] = useState(false);

  // Schedule state
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedDay, setSchedDay] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedDesc, setSchedDesc] = useState("");
  const [schedSaving, setSchedSaving] = useState(false);

  // Flyer state
  const [flyerOpen, setFlyerOpen] = useState(false);

  const isOwner = circle?.created_by === user?.id;
  const isLeader = isOwner || members.find(m => m.user_id === user?.id)?.role === "leader";

  // (old copyInvite removed — replaced by InviteShareModal)

  const handleLeave = async () => {
    if (!user || !id) return;
    await supabase.from("accountability_circle_members").delete().eq("circle_id", id).eq("user_id", user.id);
    toast({ title: "You've left the circle" });
    navigate("/circles");
  };

  const handleDelete = async () => {
    if (!id) return;
    await supabase.from("accountability_circles").delete().eq("id", id);
    toast({ title: "Circle deleted" });
    navigate("/circles");
  };

  const loadUserPrayers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("prayer_cards")
      .select("id, title, prayer_text")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setUserPrayers((data || []) as any);
    setSharePrayerOpen(true);
  };

  const sharePrayer = async () => {
    if (!user || !id || !selectedPrayerId) return;
    setSharingPrayer(true);
    try {
      const { error } = await supabase.from("accountability_circle_prayers").insert({
        circle_id: id, prayer_id: selectedPrayerId, shared_by: user.id,
      } as any);
      if (error) throw error;
      toast({ title: "Prayer shared with circle 🙏" });
      setSharePrayerOpen(false);
      setSelectedPrayerId("");
      refetch();
    } catch {
      toast({ title: "Could not share prayer", variant: "destructive" });
    } finally { setSharingPrayer(false); }
  };

  const requestEncouragement = async () => {
    if (!id) return;
    setEncourageLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/circle-encouragement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: id }),
      });
      if (!resp.ok) throw new Error("Failed");
      toast({ title: "Encouragement generated ✨" });
      refetch();
    } catch {
      toast({ title: "Could not generate encouragement", variant: "destructive" });
    } finally { setEncourageLoading(false); }
  };

  // Homework CRUD
  const createHomework = async () => {
    if (!user || !id || !hwTitle.trim()) return;
    setHwSaving(true);
    try {
      await supabase.from("circle_homework").insert({
        circle_id: id,
        title: hwTitle.trim(),
        description: hwDesc.trim() || null,
        homework_type: hwType,
        due_date: hwDue || null,
        created_by: user.id,
      } as any);
      toast({ title: "Homework assigned 📚" });
      setHwOpen(false); setHwTitle(""); setHwDesc(""); setHwType("custom"); setHwDue("");
      refetch();
    } catch {
      toast({ title: "Could not create homework", variant: "destructive" });
    } finally { setHwSaving(false); }
  };

  const submitHomework = async () => {
    if (!user || !submitHwId) return;
    setSubmittingHw(true);
    try {
      await supabase.from("circle_homework_submissions").insert({
        homework_id: submitHwId,
        user_id: user.id,
        content: submitContent.trim() || null,
      } as any);
      toast({ title: "Homework submitted ✅" });
      setSubmitHwId(null); setSubmitContent("");
      refetch();
    } catch {
      toast({ title: "Could not submit", variant: "destructive" });
    } finally { setSubmittingHw(false); }
  };

  const deleteHomework = async (hwId: string) => {
    await supabase.from("circle_homework").delete().eq("id", hwId);
    toast({ title: "Homework removed" });
    refetch();
  };

  // Schedule
  const saveSchedule = async () => {
    if (!id) return;
    setSchedSaving(true);
    try {
      await supabase.from("accountability_circles").update({
        schedule: { day: schedDay, time: schedTime, description: schedDesc },
      } as any).eq("id", id);
      toast({ title: "Schedule saved 📅" });
      setSchedOpen(false);
      refetch();
    } catch {
      toast({ title: "Could not save schedule", variant: "destructive" });
    } finally { setSchedSaving(false); }
  };

  const sortedPrayers = useMemo(() => {
    const items = prayers.map(p => p.prayer).filter(Boolean);
    items.sort((a: any, b: any) => {
      switch (sortMode) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "most-prayed": return (b.prayed_count || 0) - (a.prayed_count || 0);
        default: return 0;
      }
    });
    return items;
  }, [prayers, sortMode]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <SacredSpinner fullPage />
    </div>
  );

  if (!circle) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Circle not found.</p>
      <Link to="/circles"><Button className="btn-gold rounded-xl">Back to Circles</Button></Link>
    </div>
  );

  const schedule = (circle as any).schedule;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Back */}
        <Link to="/circles" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> All Circles
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="prayer-card rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{circle.name}</h1>
                {isOwner && <Crown className="w-4 h-4 text-primary" />}
                {(circle as any).is_public ? <Globe className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              {(circle as any).purpose && <p className="text-sm text-primary/80 font-medium">{(circle as any).purpose}</p>}
              {circle.description && <p className="text-sm text-muted-foreground">{circle.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <button onClick={() => setMembersOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Users className="w-3.5 h-3.5" /> {members.length} members
                </button>
                {schedule?.day && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="rounded-xl gap-1.5 text-xs">
                <Share2 className="w-3.5 h-3.5" /> Invite
              </Button>
              {isLeader && (
                <Button variant="outline" size="sm" onClick={() => setFlyerOpen(true)} className="rounded-xl gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" /> Flyer
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-3 gap-3">
          <div className="prayer-card rounded-2xl p-4 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(340 55% 55%)" }} />
            <p className="font-display text-xl font-bold text-foreground">{stats.totalPrayed}</p>
            <p className="text-[10px] text-muted-foreground">times prayed</p>
          </div>
          <div className="prayer-card rounded-2xl p-4 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{stats.totalPrayers}</p>
            <p className="text-[10px] text-muted-foreground">shared prayers</p>
          </div>
          <div className="prayer-card rounded-2xl p-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(25 90% 55%)" }} />
            <p className="font-display text-xl font-bold text-foreground">{stats.avgStreak}</p>
            <p className="text-[10px] text-muted-foreground">avg streak</p>
          </div>
        </motion.div>

        {/* Leader Tools: Schedule */}
        {isLeader && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSchedDay(schedule?.day || ""); setSchedTime(schedule?.time || ""); setSchedDesc(schedule?.description || ""); setSchedOpen(true); }} className="rounded-xl text-xs">
                Edit
              </Button>
            </div>
            {schedule?.day ? (
              <div className="prayer-card rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">{schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</p>
                {schedule.description && <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No schedule set. Tap Edit to add meeting times.</p>
            )}
          </motion.div>
        )}

        {/* Non-leader schedule display */}
        {!isLeader && schedule?.day && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prayer-card rounded-2xl p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </h2>
            <p className="text-sm font-medium text-foreground">{schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</p>
            {schedule.description && <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>}
          </motion.div>
        )}

        {/* Members */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Members ({members.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
                <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-white text-xs font-bold">
                  {m.profile?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{m.profile?.full_name || "Friend"}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" style={{ color: "hsl(25 90% 55%)" }} />
                    {m.profile?.current_streak || 0} day streak
                    {m.role === "owner" && <span className="ml-1 text-primary">· Leader</span>}
                    {m.role === "leader" && <span className="ml-1 text-primary">· Leader</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Homework Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Homework & Assignments
            </h2>
            {isLeader && (
              <Button variant="ghost" size="sm" onClick={() => setHwOpen(true)} className="rounded-xl text-xs gap-1">
                <Plus className="w-3 h-3" /> Assign
              </Button>
            )}
          </div>
          {homework.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              {isLeader ? "No homework assigned yet. Tap Assign to create one." : "No homework assigned yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {homework.map(hw => {
                const mySubmission = submissions.find(s => s.homework_id === hw.id && s.user_id === user?.id);
                const submissionCount = submissions.filter(s => s.homework_id === hw.id).length;
                const isPastDue = hw.due_date && new Date(hw.due_date) < new Date();

                return (
                  <div key={hw.id} className="prayer-card rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-sm text-foreground">{hw.title}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{hw.homework_type.replace("_", " ")}</span>
                        </div>
                        {hw.description && <p className="text-xs text-muted-foreground mt-1">{hw.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          {hw.due_date && (
                            <span className={`flex items-center gap-1 ${isPastDue && !mySubmission ? "text-destructive" : ""}`}>
                              <Clock className="w-2.5 h-2.5" />
                              Due {format(new Date(hw.due_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {isLeader && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {submissionCount}/{members.length} completed
                            </span>
                          )}
                        </div>
                      </div>
                      {isLeader && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteHomework(hw.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {mySubmission ? (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted {format(new Date(mySubmission.submitted_at), "MMM d")}</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSubmitHwId(hw.id); setSubmitContent(""); }}
                        className="rounded-xl text-xs gap-1.5"
                      >
                        <Check className="w-3 h-3" /> Submit
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Prayer Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)} className="btn-gold rounded-xl gap-1.5 h-9 text-sm">
            <PlusCircle className="w-4 h-4" /> New Prayer
          </Button>
          <Button variant="outline" onClick={loadUserPrayers} className="rounded-xl gap-1.5 h-9 text-sm">
            <Heart className="w-4 h-4" /> Share Existing
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-8 rounded-xl text-xs border-border min-w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">Newest</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
                <SelectItem value="most-prayed" className="text-xs">Most prayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Shared prayers grid */}
        {sortedPrayers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 space-y-3">
            <p className="text-muted-foreground text-sm">No prayers shared yet. Be the first!</p>
          </motion.div>
        ) : (
          <motion.div layout className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
            <AnimatePresence>
              {sortedPrayers.map((card: any) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                  <Link to={`/prayer/${card.id}`} className="block">
                    <div className="prayer-card p-4 rounded-2xl space-y-2 hover:border-primary/30 border border-transparent transition-all h-full">
                      {card.title && <h3 className="font-display font-semibold text-sm text-foreground line-clamp-1">{card.title}</h3>}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{card.prayer_text}</p>
                      {card.labels && card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {card.labels.slice(0, 3).map((l: string) => (
                            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>🙏 {card.prayed_count}</span>
                        <span>❤️ {card.likes_count}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* AI Encouragements */}
        {circle.ai_encouragement && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(42 75% 45%)" }} /> Encouragement
              </h2>
              <Button variant="ghost" size="sm" onClick={requestEncouragement} disabled={encourageLoading} className="rounded-xl text-xs gap-1">
                {encourageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate
              </Button>
            </div>
            {encouragements.length > 0 ? (
              encouragements.slice(0, 3).map(enc => (
                <div key={enc.id} className="rounded-2xl p-4 border border-primary/10 bg-primary/[0.03]">
                  <p className="text-sm text-foreground leading-relaxed">{enc.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(enc.generated_at).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No encouragements yet — generate one above.</p>
            )}
          </motion.div>
        )}

        {/* Prayer Companions */}
        <PrayerCompanions
          groupType="circle"
          groupId={id!}
          members={members}
          isLeader={isLeader}
          userId={user?.id}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          {!isOwner && (
            <Button variant="ghost" onClick={() => setLeaveOpen(true)} className="rounded-xl gap-1.5 text-destructive">
              <LogOut className="w-4 h-4" /> Leave Circle
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="rounded-xl gap-1.5 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Circle
            </Button>
          )}
        </div>

        <p className="verse-text text-xs text-center pt-2">
          "Therefore encourage one another and build each other up." — <VerseLink reference="1 Thessalonians 5:11" />
        </p>
      </div>

      {/* Invite Share Modal */}
      <InviteShareModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        type="circle"
        targetId={circle.id}
        targetName={circle.name}
      />

      {/* Share prayer dialog */}
      <Dialog open={sharePrayerOpen} onOpenChange={setSharePrayerOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Share a Prayer</DialogTitle>
            <DialogDescription>Choose a prayer to share with the circle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {userPrayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">You haven't created any prayers yet.</p>
            ) : (
              <>
                {userPrayers.map(p => (
                  <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPrayerId === p.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                    <input type="radio" name="sharePrayer" className="mt-0.5 accent-primary" checked={selectedPrayerId === p.id} onChange={() => setSelectedPrayerId(p.id)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title || p.prayer_text.slice(0, 60) + "…"}</p>
                    </div>
                  </label>
                ))}
                <Button onClick={sharePrayer} disabled={sharingPrayer || !selectedPrayerId} className="btn-gold rounded-xl w-full gap-2 mt-2">
                  {sharingPrayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                  Share with Circle
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Members dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Members</DialogTitle>
            <DialogDescription>{members.length} member{members.length !== 1 && "s"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-white">
                  {m.profile?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.profile?.full_name || "Member"}</p>
                  <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                    {m.role}
                    <span className="text-[10px]">· <Flame className="w-2.5 h-2.5 inline" style={{ color: "hsl(25 90% 55%)" }} /> {m.profile?.current_streak || 0}d</span>
                  </p>
                </div>
                {isOwner && m.user_id !== user?.id && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                    onClick={async () => { await supabase.from("accountability_circle_members").delete().eq("id", m.id); refetch(); }}>
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create homework dialog */}
      <Dialog open={hwOpen} onOpenChange={setHwOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Assign Homework</DialogTitle>
            <DialogDescription>Give your circle a growth assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Read Psalm 23 and reflect" className="rounded-xl mt-1" maxLength={120} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} placeholder="Detailed instructions for the assignment…" className="rounded-xl mt-1 resize-none" rows={3} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={hwType} onValueChange={setHwType}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripture_study">📖 Scripture Study</SelectItem>
                  <SelectItem value="write_prayer">✍️ Write a Prayer</SelectItem>
                  <SelectItem value="devotional">🕊️ Devotional</SelectItem>
                  <SelectItem value="custom">📝 Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Due Date (optional)</label>
              <Input type="datetime-local" value={hwDue} onChange={e => setHwDue(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <Button onClick={createHomework} disabled={hwSaving || !hwTitle.trim()} className="btn-gold rounded-xl w-full gap-2">
              {hwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Assign Homework
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit homework dialog */}
      <Dialog open={!!submitHwId} onOpenChange={() => setSubmitHwId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Submit Homework</DialogTitle>
            <DialogDescription>Share your notes, reflections, or prayer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={submitContent}
              onChange={e => setSubmitContent(e.target.value)}
              placeholder="Write your response here…"
              className="rounded-xl resize-none"
              rows={5}
            />
            <Button onClick={submitHomework} disabled={submittingHw} className="btn-gold rounded-xl w-full gap-2">
              {submittingHw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule editor dialog */}
      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Set Schedule</DialogTitle>
            <DialogDescription>When does your circle meet?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Day</label>
              <Select value={schedDay} onValueChange={setSchedDay}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select a day" /></SelectTrigger>
                <SelectContent>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Daily"].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input value={schedTime} onChange={e => setSchedTime(e.target.value)} placeholder="e.g. 7:00 PM" className="rounded-xl mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Input value={schedDesc} onChange={e => setSchedDesc(e.target.value)} placeholder="e.g. Weekly Bible Study" className="rounded-xl mt-1" />
            </div>
            <Button onClick={saveSchedule} disabled={schedSaving} className="btn-gold rounded-xl w-full gap-2">
              {schedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Save Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flyer dialog */}
      <Dialog open={flyerOpen} onOpenChange={setFlyerOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Circle Flyer</DialogTitle>
            <DialogDescription>Share this card to invite people to your circle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: "linear-gradient(135deg, hsl(42 80% 50% / 0.1), hsl(42 80% 50% / 0.02))", border: "1px solid hsl(42 80% 50% / 0.2)" }}>
              <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">{circle.name}</h3>
              {(circle as any).purpose && <p className="text-sm text-primary/80 font-medium">{(circle as any).purpose}</p>}
              {circle.description && <p className="text-xs text-muted-foreground">{circle.description}</p>}
              {schedule?.day && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                  <Calendar className="w-3 h-3" /> {schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Ask a member for an invite link to join!</p>
              <p className="text-[10px] text-muted-foreground">KeepPray.ing</p>
            </div>
            <Button onClick={() => setInviteOpen(true)} className="btn-gold rounded-xl gap-2 w-full">
              <Share2 className="w-4 h-4" /> Generate Invite Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Leave this circle?</DialogTitle>
            <DialogDescription>You can rejoin later with a new invite link.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setLeaveOpen(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleLeave} className="rounded-xl flex-1">Leave</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete this circle?</DialogTitle>
            <DialogDescription>This will remove the circle and all shared prayers permanently.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl flex-1">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add new prayer modal */}
      <AddPrayerModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={async (newPrayerId?: string) => {
          if (newPrayerId && id && user) {
            await supabase.from("accountability_circle_prayers").insert({
              circle_id: id, prayer_id: newPrayerId, shared_by: user.id,
            } as any);
          }
          refetch();
        }}
      />
    </div>
  );
}
