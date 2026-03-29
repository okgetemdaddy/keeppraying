import { useState, useEffect, useCallback, useMemo } from "react";
import SacredSpinner from "@/components/SacredSpinner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import AddPrayerModal from "@/components/AddPrayerModal";
import InviteShareModal from "@/components/InviteShareModal";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import {
  Home, ArrowLeft, PlusCircle, Loader2,
  Crown, LogOut, ArrowUpDown, UserMinus, Baby, Users, Shield,
  Calendar, ClipboardList, Plus, Trash2, CheckCircle2, Clock, FileText, Share2, Check,
}from "lucide-react";

type PrayerCard = Database["public"]["Tables"]["prayer_cards"]["Row"];
type SortMode = "newest" | "oldest" | "most-prayed";

export default function FamilyRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<PrayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePrayerId, setSharePrayerId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [userPrayers, setUserPrayers] = useState<PrayerCard[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [membersOpen, setMembersOpen] = useState(false);

  // Homework state
  const [homework, setHomework] = useState<any[]>([]);
  const [hwSubmissions, setHwSubmissions] = useState<any[]>([]);
  const [hwOpen, setHwOpen] = useState(false);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwType, setHwType] = useState("custom");
  const [hwDue, setHwDue] = useState("");
  const [hwSaving, setHwSaving] = useState(false);
  const [submitHwId, setSubmitHwId] = useState<string | null>(null);
  const [submitContent, setSubmitContent] = useState("");
  const [submittingHw, setSubmittingHw] = useState(false);

  // Schedule state
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedDay, setSchedDay] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedDesc, setSchedDesc] = useState("");
  const [schedSaving, setSchedSaving] = useState(false);

  // Flyer
  const [flyerOpen, setFlyerOpen] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [{ data: roomData }, { data: memberData }, { data: rpData }, { data: hwData }] = await Promise.all([
      supabase.from("family_rooms").select("*").eq("id", id).single(),
      supabase.from("family_room_members").select("*, profiles:user_id(full_name, email, avatar_url, current_streak)").eq("room_id", id),
      supabase.from("family_room_prayers").select("*, prayer_cards(*)").eq("room_id", id).order("created_at", { ascending: false }),
      supabase.from("family_homework").select("*").eq("room_id", id).order("created_at", { ascending: false }),
    ]);
    setRoom(roomData);
    setMembers(memberData || []);
    setPrayers((rpData || []).map((r: any) => r.prayer_cards).filter(Boolean));

    if (hwData && hwData.length > 0) {
      setHomework(hwData);
      const hwIds = hwData.map((h: any) => h.id);
      const { data: subs } = await supabase.from("family_homework_submissions").select("*").in("homework_id", hwIds);
      setHwSubmissions(subs || []);
    } else {
      setHomework([]);
      setHwSubmissions([]);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    if (!id) return;
    const ch1 = supabase.channel(`family-prayers-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "family_room_prayers", filter: `room_id=eq.${id}` }, () => fetchRoom())
      .subscribe();
    const ch2 = supabase.channel(`family-hw-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_homework", filter: `room_id=eq.${id}` }, () => fetchRoom())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [id, fetchRoom]);

  const loadUserPrayers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("prayer_cards").select("*").eq("created_by", user.id).order("created_at", { ascending: false }).limit(50);
    setUserPrayers(data || []);
  }, [user]);

  const handleShare = async () => {
    if (!sharePrayerId || !id || !user) return;
    setSharing(true);
    const { error } = await supabase.from("family_room_prayers").insert({ room_id: id, prayer_id: sharePrayerId, shared_by: user.id });
    setSharing(false);
    if (error) { toast({ title: error.code === "23505" ? "Already shared" : "Failed to share", variant: "destructive" }); }
    else { toast({ title: "Prayer shared with family 🏠" }); setShareOpen(false); fetchRoom(); }
  };

  const handleLeave = async () => {
    if (!id || !user) return;
    await supabase.from("family_room_members").delete().eq("room_id", id).eq("user_id", user.id);
    toast({ title: "Left family room" });
    navigate("/family");
  };

  const toggleChildFriendly = async () => {
    if (!room || room.created_by !== user?.id) return;
    const next = !room.child_friendly;
    await supabase.from("family_rooms").update({ child_friendly: next }).eq("id", room.id);
    setRoom({ ...room, child_friendly: next });
    toast({ title: next ? "Child-friendly mode on 🧸" : "Child-friendly mode off" });
  };

  // (old copyCode removed — replaced by InviteShareModal)

  // Homework
  const createHomework = async () => {
    if (!user || !id || !hwTitle.trim()) return;
    setHwSaving(true);
    try {
      await supabase.from("family_homework").insert({
        room_id: id, title: hwTitle.trim(), description: hwDesc.trim() || null,
        homework_type: hwType, due_date: hwDue || null, created_by: user.id,
      } as any);
      toast({ title: "Homework assigned 📚" });
      setHwOpen(false); setHwTitle(""); setHwDesc(""); setHwType("custom"); setHwDue("");
      fetchRoom();
    } catch { toast({ title: "Could not create homework", variant: "destructive" }); }
    finally { setHwSaving(false); }
  };

  const submitHomework = async () => {
    if (!user || !submitHwId) return;
    setSubmittingHw(true);
    try {
      await supabase.from("family_homework_submissions").insert({
        homework_id: submitHwId, user_id: user.id, content: submitContent.trim() || null,
      } as any);
      toast({ title: "Homework submitted ✅" });
      setSubmitHwId(null); setSubmitContent("");
      fetchRoom();
    } catch { toast({ title: "Could not submit", variant: "destructive" }); }
    finally { setSubmittingHw(false); }
  };

  const deleteHomework = async (hwId: string) => {
    await supabase.from("family_homework").delete().eq("id", hwId);
    toast({ title: "Homework removed" });
    fetchRoom();
  };

  const saveSchedule = async () => {
    if (!id) return;
    setSchedSaving(true);
    try {
      await supabase.from("family_rooms").update({
        schedule: { day: schedDay, time: schedTime, description: schedDesc },
      } as any).eq("id", id);
      toast({ title: "Schedule saved 📅" });
      setSchedOpen(false);
      fetchRoom();
    } catch { toast({ title: "Could not save schedule", variant: "destructive" }); }
    finally { setSchedSaving(false); }
  };

  const sortedPrayers = useMemo(() => {
    const items = [...prayers];
    items.sort((a, b) => {
      switch (sortMode) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "most-prayed": return (b.prayed_count || 0) - (a.prayed_count || 0);
        default: return 0;
      }
    });
    return items;
  }, [prayers, sortMode]);

  if (!user) return null;
  if (loading) return <div className="min-h-screen bg-background"><SiteNav /><SacredSpinner fullPage /></div>;
  if (!room) return (
    <div className="min-h-screen bg-background"><SiteNav />
      <div className="text-center py-24 space-y-3">
        <p className="text-muted-foreground">Family room not found.</p>
        <Link to="/family"><Button variant="outline" className="rounded-xl">Back to Family Rooms</Button></Link>
      </div>
    </div>
  );

  const isOwner = room.created_by === user.id;
  const isLeader = isOwner || members.find((m: any) => m.user_id === user.id)?.role === "leader";
  const schedule = room.schedule;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Link to="/family" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Family Rooms
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prayer-card p-6 rounded-2xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{room.name}</h1>
                {isOwner && <Crown className="w-4 h-4 text-primary" />}
                {room.child_friendly && <Baby className="w-4 h-4 text-pink-400" />}
              </div>
              {room.purpose && <p className="text-sm text-primary/80 font-medium">{room.purpose}</p>}
              {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <button onClick={() => setMembersOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Users className="w-3.5 h-3.5" /> {members.length} {members.length === 1 ? "member" : "members"}
                </button>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Private</span>
                {schedule?.day && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {isOwner && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50">
                  <Baby className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs text-muted-foreground">Kid-safe</span>
                  <Switch checked={room.child_friendly} onCheckedChange={toggleChildFriendly} className="scale-90" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="rounded-xl gap-1.5 text-xs">
                <Share2 className="w-3.5 h-3.5" /> Invite
              </Button>
              {isLeader && (
                <Button variant="outline" size="sm" onClick={() => setFlyerOpen(true)} className="rounded-xl gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" /> Flyer
                </Button>
              )}
              {!isOwner && (
                <Button variant="ghost" size="sm" onClick={handleLeave} className="rounded-xl gap-1.5 text-xs text-destructive hover:text-destructive">
                  <LogOut className="w-3.5 h-3.5" /> Leave
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Child-friendly banner */}
        {room.child_friendly && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "hsl(330 60% 96%)", border: "1px solid hsl(330 40% 90%)" }}>
            <span className="text-2xl">🧸</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "hsl(330 40% 35%)" }}>Child-Friendly Mode is On</p>
              <p className="text-xs" style={{ color: "hsl(330 30% 50%)" }}>Content is gentle and age-appropriate.</p>
            </div>
          </motion.div>
        )}

        {/* Schedule */}
        {isLeader && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSchedDay(schedule?.day || ""); setSchedTime(schedule?.time || ""); setSchedDesc(schedule?.description || ""); setSchedOpen(true); }} className="rounded-xl text-xs">Edit</Button>
            </div>
            {schedule?.day ? (
              <div className="prayer-card rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">{schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</p>
                {schedule.description && <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>}
              </div>
            ) : <p className="text-xs text-muted-foreground italic">No schedule set.</p>}
          </div>
        )}

        {!isLeader && schedule?.day && (
          <div className="prayer-card rounded-2xl p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2"><Calendar className="w-3.5 h-3.5" /> Schedule</h2>
            <p className="text-sm font-medium text-foreground">{schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</p>
            {schedule.description && <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>}
          </div>
        )}

        {/* Homework */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Homework
            </h2>
            {isLeader && (
              <Button variant="ghost" size="sm" onClick={() => setHwOpen(true)} className="rounded-xl text-xs gap-1">
                <Plus className="w-3 h-3" /> Assign
              </Button>
            )}
          </div>
          {homework.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{isLeader ? "No homework yet. Tap Assign." : "No homework assigned."}</p>
          ) : (
            <div className="space-y-3">
              {homework.map((hw: any) => {
                const mySubmission = hwSubmissions.find((s: any) => s.homework_id === hw.id && s.user_id === user?.id);
                const subCount = hwSubmissions.filter((s: any) => s.homework_id === hw.id).length;
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
                              <Clock className="w-2.5 h-2.5" /> Due {format(new Date(hw.due_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {isLeader && <span className="flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> {subCount}/{members.length}</span>}
                        </div>
                      </div>
                      {isLeader && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteHomework(hw.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                    {mySubmission ? (
                      <div className="flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted {format(new Date(mySubmission.submitted_at), "MMM d")}</div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => { setSubmitHwId(hw.id); setSubmitContent(""); }} className="rounded-xl text-xs gap-1.5">
                        <Check className="w-3 h-3" /> Submit
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prayer Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)} className="btn-gold rounded-xl gap-1.5 h-9 text-sm">
            <PlusCircle className="w-4 h-4" /> New Prayer
          </Button>
          <Button variant="outline" onClick={() => { loadUserPrayers(); setShareOpen(true); setSharePrayerId(""); }} className="rounded-xl gap-1.5 h-9 text-sm">
            <PlusCircle className="w-4 h-4" /> Share Existing
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

        {/* Prayers */}
        {sortedPrayers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">No prayers shared yet.</p>
            <p className="verse-text text-xs">"As for me and my house, we will serve the Lord." — Joshua 24:15</p>
          </motion.div>
        ) : (
          <motion.div layout className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
            <AnimatePresence>
              {sortedPrayers.map((card) => (
                <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                  <Link to={`/prayer/${card.id}`} className="block">
                    <div className="prayer-card p-4 rounded-2xl space-y-2 hover:border-primary/30 border border-transparent transition-all h-full">
                      {card.title && <h3 className="font-display font-semibold text-sm text-foreground line-clamp-1">{card.title}</h3>}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{card.prayer_text}</p>
                      {card.labels && card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {card.labels.slice(0, 3).map((l) => <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>)}
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

        {/* Prayer Companions */}
        <PrayerCompanions
          groupType="family"
          groupId={id!}
          members={members}
          isLeader={isLeader}
          userId={user?.id}
        />
      </div>

      {/* Members dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Family Members</DialogTitle>
            <DialogDescription>{members.length} member{members.length !== 1 && "s"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {members.map((m: any) => {
              const profile = m.profiles;
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email || "Member"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                  {isOwner && m.user_id !== user.id && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={async () => { await supabase.from("family_room_members").delete().eq("id", m.id); fetchRoom(); }}>
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share prayer dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Share a Prayer</DialogTitle>
            <DialogDescription>Choose one of your prayers to share with the family.</DialogDescription>
          </DialogHeader>
          {userPrayers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">You haven't created any prayers yet.</p>
          ) : (
            <div className="space-y-2">
              {userPrayers.map((p) => (
                <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  sharePrayerId === p.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                  <input type="radio" name="sharePrayer" className="mt-0.5 accent-primary" checked={sharePrayerId === p.id} onChange={() => setSharePrayerId(p.id)} />
                  <p className="text-sm font-medium truncate min-w-0">{p.title || p.prayer_text.slice(0, 60) + "…"}</p>
                </label>
              ))}
              <Button onClick={handleShare} disabled={!sharePrayerId || sharing} className="w-full btn-gold rounded-xl h-10 gap-2 mt-2">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Share with Family
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create homework dialog */}
      <Dialog open={hwOpen} onOpenChange={setHwOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Assign Homework</DialogTitle>
            <DialogDescription>Give your family a growth assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Read Psalm 23 together" className="rounded-xl mt-1" maxLength={120} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} placeholder="Instructions…" className="rounded-xl mt-1 resize-none" rows={3} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={hwType} onValueChange={setHwType}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripture_study">📖 Scripture Study</SelectItem>
                  <SelectItem value="write_prayer">✍️ Write a Prayer</SelectItem>
                  <SelectItem value="devotional">🕊️ Devotional</SelectItem>
                  <SelectItem value="custom">📝 Custom</SelectItem>
                </SelectContent>
              </Select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input type="datetime-local" value={hwDue} onChange={e => setHwDue(e.target.value)} className="rounded-xl mt-1" /></div>
            <Button onClick={createHomework} disabled={hwSaving || !hwTitle.trim()} className="btn-gold rounded-xl w-full gap-2">
              {hwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit homework */}
      <Dialog open={!!submitHwId} onOpenChange={() => setSubmitHwId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Submit Homework</DialogTitle>
            <DialogDescription>Share your notes, reflections, or prayer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} placeholder="Write your response…" className="rounded-xl resize-none" rows={5} />
            <Button onClick={submitHomework} disabled={submittingHw} className="btn-gold rounded-xl w-full gap-2">
              {submittingHw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Set Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className="text-xs font-medium text-muted-foreground">Day</label>
              <Select value={schedDay} onValueChange={setSchedDay}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Daily"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Time</label>
              <Input value={schedTime} onChange={e => setSchedTime(e.target.value)} placeholder="e.g. 7:00 PM" className="rounded-xl mt-1" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input value={schedDesc} onChange={e => setSchedDesc(e.target.value)} placeholder="e.g. Family devotional" className="rounded-xl mt-1" /></div>
            <Button onClick={saveSchedule} disabled={schedSaving} className="btn-gold rounded-xl w-full gap-2">
              {schedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flyer dialog */}
      <Dialog open={flyerOpen} onOpenChange={setFlyerOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Family Room Flyer</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: "linear-gradient(135deg, hsl(42 80% 50% / 0.1), hsl(42 80% 50% / 0.02))", border: "1px solid hsl(42 80% 50% / 0.2)" }}>
              <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold"><Home className="w-6 h-6 text-white" /></div>
              <h3 className="font-display text-xl font-bold text-foreground">{room.name}</h3>
              {room.purpose && <p className="text-sm text-primary/80 font-medium">{room.purpose}</p>}
              {room.description && <p className="text-xs text-muted-foreground">{room.description}</p>}
              {schedule?.day && <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Calendar className="w-3 h-3" /> {schedule.day}{schedule.time ? ` at ${schedule.time}` : ""}</p>}
              <p className="text-[10px] text-muted-foreground mt-2">Ask a member for an invite link to join!</p>
              <p className="text-[10px] text-muted-foreground">KeepPray.ing</p>
            </div>
            <Button onClick={() => setInviteOpen(true)} className="btn-gold rounded-xl gap-2 w-full"><Share2 className="w-4 h-4" /> Generate Invite Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Share Modal */}
      <InviteShareModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        type="family"
        targetId={room.id}
        targetName={room.name}
      />

      <AddPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={async (newPrayerId?: string) => {
        if (newPrayerId && id && user) {
          await supabase.from("family_room_prayers").insert({ room_id: id, prayer_id: newPrayerId, shared_by: user.id });
        }
        fetchRoom();
      }} />
    </div>
  );
}
