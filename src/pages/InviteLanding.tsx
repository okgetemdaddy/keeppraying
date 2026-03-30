import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import SacredSpinner from "@/components/SacredSpinner";
import { Button } from "@/components/ui/button";
import VerseLink from "@/components/VerseLink";
import {
  Home, Users, Heart, BookOpen, Shield, Sparkles, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

export default function InviteLanding() {
  const { type, token } = useParams<{ type: string; token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tokenData, setTokenData] = useState<any>(null);
  const [targetName, setTargetName] = useState("");
  const [targetDesc, setTargetDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [expired, setExpired] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token || !type) return;
    const fetchToken = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .eq("type", type)
        .eq("used", false)
        .single();

      if (error || !data) {
        setExpired(true);
        setLoading(false);
        return;
      }

      if (new Date((data as any).expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setTokenData(data);

      // Fetch target info
      if (type === "sermon_plan") {
        const { data: target } = await supabase
          .from("sermon_prayer_plans")
          .select("*")
          .eq("id", (data as any).target_id)
          .single() as any;
        if (target) {
          setTargetName(target.sermon_title || "Week of Prayer");
          setTargetDesc(`A ${(target.daily_prompts || []).length}-day prayer plan inspired by "${target.sermon_title}"`);
        }
      } else {
        const table = type === "family" ? "family_rooms" : "accountability_circles";
        const { data: target } = await supabase
          .from(table)
          .select("name, description, purpose")
          .eq("id", (data as any).target_id)
          .single();

        if (target) {
          setTargetName((target as any).name || "");
          setTargetDesc((target as any).purpose || (target as any).description || "");
        }
      }

      setLoading(false);
    };
    fetchToken();
  }, [token, type]);

  // Auto-join after auth redirect
  useEffect(() => {
    const pendingJoin = sessionStorage.getItem("pending_invite_join");
    if (pendingJoin && user && tokenData && !joining && !joined) {
      sessionStorage.removeItem("pending_invite_join");
      handleJoin();
    }
  }, [user, tokenData]);

  const handleJoin = async () => {
    if (!user) {
      sessionStorage.setItem("pending_invite_join", `${type}/${token}`);
      navigate(`/auth?redirect=/invite/${type}/${token}`);
      return;
    }

    if (!tokenData) return;
    setJoining(true);

    try {
      if (type === "sermon_plan") {
        // Join sermon plan
        const { error: memberError } = await supabase
          .from("sermon_plan_members")
          .insert({
            plan_id: tokenData.target_id,
            user_id: user.id,
          } as any);

        if (memberError) {
          if (memberError.code === "23505") {
            toast({ title: "You're already in this plan! 🙏" });
            navigate("/sermon-sync");
            return;
          }
          throw memberError;
        }

        await supabase.from("invite_tokens").update({ used: true } as any).eq("id", tokenData.id);
        setJoined(true);
        toast({ title: `Joined Week of Prayer! 🙏`, description: `You've joined the prayer plan for "${targetName}".` });
        setTimeout(() => navigate("/sermon-sync"), 1500);
      } else {
        const memberTable = type === "family" ? "family_room_members" : "accountability_circle_members";
        const idColumn = type === "family" ? "room_id" : "circle_id";

        const { error: memberError } = await supabase
          .from(memberTable)
          .insert({
            [idColumn]: tokenData.target_id,
            user_id: user.id,
            role: "member",
          } as any);

        if (memberError) {
          if (memberError.code === "23505") {
            toast({ title: "You're already a member! 🙏" });
            const redirectPath = type === "family" ? `/family/${tokenData.target_id}` : `/circles/${tokenData.target_id}`;
            navigate(redirectPath);
            return;
          }
          throw memberError;
        }

        await supabase.from("invite_tokens").update({ used: true } as any).eq("id", tokenData.id);
        setJoined(true);
        toast({ title: `Welcome to ${targetName}! 🙏`, description: type === "family" ? "You've joined the family room." : "You've joined the circle." });

        setTimeout(() => {
          const redirectPath = type === "family" ? `/family/${tokenData.target_id}` : `/circles/${tokenData.target_id}`;
          navigate(redirectPath);
        }, 1500);
      }
    } catch {
      toast({ title: "Could not join", description: "Please try again or ask for a new invite.", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SacredSpinner />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Invite Expired</h1>
          <p className="text-sm text-muted-foreground">
            This invite link has expired or has already been used. Please ask for a new one.
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            Go to KeepPray.ing
          </Button>
        </motion.div>
      </div>
    );
  }

  const Icon = type === "family" ? Home : type === "sermon_plan" ? Church : Users;
  const typeLabel = type === "family" ? "Family Prayer Room" : type === "sermon_plan" ? "Week of Prayer" : "Prayer Circle";

  return (
    <div className="min-h-screen bg-background">
      {/* Golden header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, hsl(42 85% 44%), hsl(35 82% 54%), hsl(42 75% 46%))",
          minHeight: "220px",
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px, 80px 80px",
        }} />
        <div className="relative z-10 container mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Icon className="w-10 h-10 text-white" />
            </div>
            <p className="text-white/80 text-sm font-medium tracking-wide uppercase mb-2">{typeLabel}</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">{targetName}</h1>
            {targetDesc && <p className="text-white/80 text-sm max-w-md mx-auto">{targetDesc}</p>}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-lg space-y-8 -mt-6 relative z-20">
        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="prayer-card rounded-2xl p-6 shadow-prayer text-center space-y-4"
        >
          <h2 className="font-display text-xl font-bold text-foreground">
            You've Been Invited! 🕊️
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Someone special has invited you to join <strong className="text-foreground">{targetName}</strong> — a {type === "family" ? "private family prayer space" : "faith community"} on KeepPray.ing where hearts gather before God.
          </p>

          {joined ? (
            <div className="flex items-center justify-center gap-2 text-primary py-4">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-display text-lg font-semibold">Welcome! Redirecting…</span>
            </div>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="btn-gold rounded-xl gap-2 w-full h-12 text-base shadow-gold"
            >
              {joining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              {joining ? "Joining…" : `Join ${targetName}`}
            </Button>
          )}

          {!user && !joined && (
            <p className="text-xs text-muted-foreground">
              You'll be asked to sign in or create a free account first.
            </p>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center">What You'll Find Inside</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Heart, title: "Pray Together", desc: "Share prayers and lift each other up before God." },
              { icon: BookOpen, title: "Grow in Faith", desc: "Scripture-based homework, devotionals, and growth." },
              { icon: Shield, title: "Safe & Private", desc: "A trusted space for your most personal prayers." },
              { icon: Sparkles, title: "AI Encouragement", desc: "Receive uplifting words rooted in Scripture." },
            ].map((feature, i) => (
              <div key={i} className="prayer-card rounded-xl p-4 text-center space-y-2">
                <feature.icon className="w-5 h-5 mx-auto text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Verse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center space-y-2 pb-8"
        >
          <p className="verse-text text-sm italic text-muted-foreground">
            "For where two or three gather in my name, there am I with them."
          </p>
          <p className="text-xs text-primary">
            — <VerseLink reference="Matthew 18:20" />
          </p>
          <p className="text-[10px] text-muted-foreground pt-4">
            KeepPray.ing — A sacred digital prayer closet
          </p>
        </motion.div>
      </div>
    </div>
  );
}
