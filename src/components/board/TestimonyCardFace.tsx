import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Share2, CalendarIcon, ChevronDown, Send } from "lucide-react";
import { FormattedText } from "@/lib/FormattedText";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Verse {
  ref: string;
  text: string;
}

interface TestimonyUpdate {
  id: string;
  body: string;
  created_at: string;
}

interface TestimonyCardFaceProps {
  testimony: {
    id: string;
    title: string | null;
    body: string;
    verses: Verse[];
    praise_count: number;
    created_at: string;
    user_id: string;
    answered_date?: string | null;
  };
  onFlipBack: () => void;
  accentColor?: string;
  textColor?: string;
  cardBg?: string;
}

export function TestimonyCardFace({
  testimony,
  onFlipBack,
  accentColor = "hsl(42 75% 40%)",
  textColor = "hsl(25 35% 14%)",
  cardBg = "hsl(var(--card))",
}: TestimonyCardFaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [praiseCount, setPraiseCount] = useState(testimony.praise_count || 0);
  const [userPraised, setUserPraised] = useState(false);
  const [praiseAnimating, setPraiseAnimating] = useState(false);

  // Answered date
  const [answeredDate, setAnsweredDate] = useState<Date | undefined>(
    testimony.answered_date ? new Date(testimony.answered_date) : new Date(testimony.created_at)
  );

  // Updates / faith journey
  const [updates, setUpdates] = useState<TestimonyUpdate[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const isOwner = user?.id === testimony.user_id;

  // Fetch updates
  useEffect(() => {
    supabase
      .from("testimony_updates" as any)
      .select("id, body, created_at")
      .eq("testimony_id", testimony.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setUpdates(data as any);
      });
  }, [testimony.id]);

  const togglePraise = async () => {
    if (!user) {
      toast({ title: "Sign in to praise 🙏" });
      return;
    }
    setPraiseAnimating(true);
    setTimeout(() => setPraiseAnimating(false), 400);

    if (userPraised) {
      setUserPraised(false);
      setPraiseCount(c => Math.max(0, c - 1));
      await supabase.from("testimony_praises").delete().eq("testimony_id", testimony.id).eq("user_id", user.id);
    } else {
      setUserPraised(true);
      setPraiseCount(c => c + 1);
      await supabase.from("testimony_praises").insert({ testimony_id: testimony.id, user_id: user.id } as any);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/testimony/${testimony.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Testimony link copied! 🔗" }));
  };

  const handleDateChange = async (date: Date | undefined) => {
    if (!date || !isOwner) return;
    setAnsweredDate(date);
    await supabase
      .from("testimonies")
      .update({ answered_date: format(date, "yyyy-MM-dd") } as any)
      .eq("id", testimony.id);
  };

  const submitUpdate = async () => {
    if (!updateText.trim() || !user) return;
    setSubmittingUpdate(true);
    const { data, error } = await supabase
      .from("testimony_updates" as any)
      .insert({ testimony_id: testimony.id, user_id: user.id, body: updateText.trim() })
      .select("id, body, created_at")
      .single();
    if (!error && data) {
      setUpdates(prev => [...prev, data as any]);
      setUpdateText("");
      setShowUpdateForm(false);
      toast({ title: "Faith journey updated ✨" });
    }
    setSubmittingUpdate(false);
  };

  const subtleText = `${textColor}70`;
  const verses: Verse[] = Array.isArray(testimony.verses) ? testimony.verses : [];

  return (
    <div
      className="relative flex flex-col h-full overflow-y-auto overscroll-contain p-4"
      style={{ background: cardBg, color: textColor }}
    >
      {/* Glass sheen */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }}
      />


      <div className="relative flex flex-col gap-3 flex-1">
        {/* Answered date — editable for owner */}
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-1 transition-colors hover:bg-accent/20"
                  style={{ color: accentColor }}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {answeredDate ? format(answeredDate, "MMM d, yyyy") : "Set date answered"}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={answeredDate}
                  onSelect={handleDateChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: subtleText }}>
              <CalendarIcon className="w-3 h-3" />
              {answeredDate ? format(answeredDate, "MMM d, yyyy") : ""}
            </span>
          )}
        </div>

        {/* Title */}
        {testimony.title && (
          <h3 className="font-display font-semibold text-sm leading-snug" style={{ color: accentColor }}>
            {testimony.title}
          </h3>
        )}

        {/* Body */}
        <FormattedText
          text={testimony.body}
          truncateAt={300}
          className="text-sm leading-relaxed"
          style={{ color: `${textColor}dd` }}
        />

        {/* Verses */}
        {verses.length > 0 && (
          <div className="space-y-1.5">
            {verses.slice(0, 2).map(v => (
              <div key={v.ref} className="flex items-start gap-1.5">
                <BookOpen className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <p className="text-[10px] font-display italic leading-snug" style={{ color: subtleText }}>
                  <span className="font-semibold not-italic" style={{ color: accentColor }}>{v.ref}</span>{" "}
                  — {v.text.slice(0, 80)}{v.text.length > 80 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Faith Journey Updates ──────────────────────────────────────── */}
        {updates.length > 0 && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: `${textColor}12` }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${textColor}40` }}>
              Faith Journey
            </p>
            {updates.map(u => (
              <div key={u.id} className="pl-3 border-l-2" style={{ borderColor: `${accentColor}40` }}>
                <span className="text-[10px] font-medium" style={{ color: subtleText }}>
                  {format(new Date(u.created_at), "MMM d, yyyy")}
                </span>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: `${textColor}cc` }}>
                  {u.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Update button / form — owner only */}
        {isOwner && (
          <div className="pt-1">
            {showUpdateForm ? (
              <div className="space-y-2">
                <Textarea
                  value={updateText}
                  onChange={e => setUpdateText(e.target.value)}
                  placeholder="Share what God has done since then…"
                  className="text-sm rounded-xl min-h-[80px] resize-none"
                  style={{ background: `${textColor}08`, borderColor: `${textColor}15` }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={submitUpdate}
                    disabled={!updateText.trim() || submittingUpdate}
                    className="rounded-xl gap-1.5 text-xs"
                    style={{ background: accentColor, color: "white" }}
                  >
                    <Send className="w-3 h-3" />
                    {submittingUpdate ? "Saving…" : "Post Update"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowUpdateForm(false); setUpdateText(""); }}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowUpdateForm(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all hover:brightness-95 active:scale-95"
                style={{ background: `${accentColor}12`, color: accentColor }}
              >
                ✏️ Add Update
              </button>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: `${textColor}12` }}>
          {/* Praise hands */}
          <motion.button
            onClick={togglePraise}
            animate={praiseAnimating ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.35, type: "spring" }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40 active:scale-95"
            style={{ color: userPraised ? accentColor : subtleText }}
          >
            <span className="text-base">🙌</span>
            <span className="font-medium">{praiseCount > 0 ? praiseCount : ""}</span>
          </motion.button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs transition-all hover:bg-accent/40"
            style={{ color: subtleText }}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1" />

          {/* Back to Prayer */}
          <button
            onClick={onFlipBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:brightness-95 active:scale-95"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            🙏 Back to Prayer
          </button>
        </div>
      </div>
    </div>
  );
}
