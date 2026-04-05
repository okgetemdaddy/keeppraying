import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Sparkles, Star, Gift, Crown, Send, Loader2, Coffee,
  TrendingUp, CheckCircle2, MessageSquare, Lightbulb, ArrowRight,
} from "lucide-react";

/* ── Stripe Price IDs ── */
const ONE_TIME_TIERS = [
  { label: "Seed — $5", priceId: "price_1TFppdDUKR31DNgBs8rZtDs3", amount: 5, icon: Coffee },
  { label: "Blessing — $10", priceId: "price_1TFpqADUKR31DNgBhhT07mvb", amount: 10, icon: Heart },
  { label: "Harvest — $25", priceId: "price_1TFpqXDUKR31DNgBeqSssIvI", amount: 25, icon: Star },
  { label: "Kingdom — $50", priceId: "price_1TFpqxDUKR31DNgBWGgZ68Ty", amount: 50, icon: Crown },
];

const RECURRING_TIERS = [
  { label: "Monthly Seed — $5/mo", priceId: "price_1TFprbDUKR31DNgBw9j6Qkwg", amount: 5, icon: Coffee },
  { label: "Monthly Blessing — $10/mo", priceId: "price_1TFprsDUKR31DNgBvcR8clvt", amount: 10, icon: Heart },
  { label: "Monthly Harvest — $25/mo", priceId: "price_1TFps8DUKR31DNgBkoH3zUUS", amount: 25, icon: Star },
];

interface UpdateLog {
  id: string;
  description: string;
  created_at: string;
}

export default function Support() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const donated = searchParams.get("donated") === "true";

  const location = useLocation();
  const [donationTab, setDonationTab] = useState<"one_time" | "recurring">("one_time");
  const [donating, setDonating] = useState<string | null>(null);
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [feedbackType, setFeedbackType] = useState("feature_request");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // After successful donation, verify donor status
  useEffect(() => {
    if (donated && session) {
      supabase.functions.invoke("donation-webhook", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(({ data }) => {
        if (data?.founder) {
          toast({ title: "🏆 Founder Status Earned!", description: "You're among the first 100 supporters — forever honored!" });
        } else if (data?.donor) {
          toast({ title: "💛 Thank you for your generosity!", description: "Your donor badge is now on your profile." });
        }
      });
    }
  }, [donated, session]);

  // Scroll to hash section with fast smooth animation
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // Small delay to let the page render
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);


  useEffect(() => {
    const fetchLogs = () => {
      supabase
        .from("update_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => setLogs((data as UpdateLog[]) || []));
    };
    fetchLogs();

    const channel = supabase
      .channel("update_logs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "update_logs" },
        () => fetchLogs()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDonate = async (priceId: string, mode: "payment" | "subscription") => {
    if (!user) {
      toast({ title: "Please sign in first", description: "You need an account to donate.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setDonating(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation", {
        body: { priceId, mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      toast({ title: "Something went wrong", description: e instanceof Error ? e.message : "Please try again", variant: "destructive" });
    } finally {
      setDonating(null);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need an account to submit feedback.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!feedbackMessage.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    setSubmittingFeedback(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user.id,
        feedback_type: feedbackType,
        title: feedbackTitle.trim() || null,
        message: feedbackMessage.trim(),
      });
      if (error) throw error;
      toast({ title: "🙏 Thank you!", description: "Your feedback has been received. We're praying over it." });
      setFeedbackTitle("");
      setFeedbackMessage("");
    } catch (e) {
      toast({ title: "Failed to submit", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const tiers = donationTab === "one_time" ? ONE_TIME_TIERS : RECURRING_TIERS;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-16 px-4">
        <div className="absolute inset-0 bg-[var(--gradient-divine)] opacity-60" />
        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          >
            <Heart className="w-4 h-4" /> Support the Mission
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-tight"
          >
            Keep the Prayers Rising
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Your generosity keeps this sacred digital prayer closet open for believers around the world.
          </motion.p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-24 space-y-16">

        {/* ── Pledge ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative"
        >
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--gradient-gold)]" />
            <CardContent className="p-6 md:p-10">
              <div className="flex items-start gap-3 mb-5">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Our Pledge to You</h2>
              </div>
              <blockquote className="text-foreground/85 text-sm md:text-base leading-relaxed space-y-4 border-l-4 border-primary/30 pl-5 italic">
                <p>
                  All resources given are used solely to sustain the KeepPray.ing platform and add new features users request.
                  A subscription service will be introduced at some point to cover technical user costs such as the read prayer
                  out loud feature and our Prayer Assistant…
                </p>
                <p>
                  Our pledge is to lower subscription costs as more users join.
                </p>
                <p className="font-semibold not-italic text-primary">
                  Pray for free!! Copy, share and edit any prayer you like. Pray with us for the continued growth of a
                  strong community seeking the Kingdom of God and His righteousness!
                </p>
              </blockquote>
            </CardContent>
          </Card>
        </motion.section>

        {/* ── Donation Options ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Sow Into the Kingdom</h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Every gift, no matter the size, fuels this ministry. The first 100 donors receive
              <span className="text-primary font-semibold"> Founder status</span> and a lifetime membership for all future updates, forever.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl bg-muted p-1 gap-1">
              <button
                onClick={() => setDonationTab("one_time")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  donationTab === "one_time"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Gift className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                One-Time Gift
              </button>
              <button
                onClick={() => setDonationTab("recurring")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  donationTab === "recurring"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Monthly Partner
              </button>
            </div>
          </div>

          {/* Tier Cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={donationTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {tiers.map((tier, i) => {
                const Icon = tier.icon;
                return (
                  <motion.div
                    key={tier.priceId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className="border-border/60 hover:border-primary/40 transition-all hover:shadow-lg group cursor-pointer h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center gap-2 h-full">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-bold text-foreground text-lg">${tier.amount}</h3>
                        <Button
                          size="sm"
                          className="w-full mt-auto"
                          onClick={() => handleDonate(tier.priceId, donationTab === "recurring" ? "subscription" : "payment")}
                          disabled={donating === tier.priceId}
                        >
                          {donating === tier.priceId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Give {donationTab === "recurring" ? "Monthly" : "Now"}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {donated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/30 text-center"
            >
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold text-foreground mb-1">Thank You, Faithful Giver!</h3>
              <p className="text-muted-foreground text-sm">
                Your generosity sustains the prayers of believers worldwide. God sees your heart. 💛
              </p>
            </motion.div>
          )}
        </motion.section>

        {/* ── Update Log ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Bless the Fruit of Our Labor
            </h2>
            <p className="text-muted-foreground text-sm">
              We treat every decision as Kingdom work that carries eternal weight.
            </p>
          </div>

          <div className="space-y-3">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 items-start"
              >
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-primary/70 mt-1.5" />
                  {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-6">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(log.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{log.description}</p>
                </div>
              </motion.div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">The journey is just beginning…</p>
            )}
          </div>
        </motion.section>

        {/* ── Our Heart Behind the Tools ── */}
        <motion.section
          id="ai-stance"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="p-6 md:p-10">
              <div className="flex items-start gap-3 mb-5">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Our Heart Behind the Tools</h2>
              </div>
              <div className="text-foreground/85 text-sm md:text-base leading-relaxed space-y-4 border-l-4 border-primary/30 pl-5">
                <p>
                  At KeepPray.ing, we see Artificial Intelligence as a neutral tool — neither inherently good nor evil. Its value depends entirely on how it is used.
                </p>
                <p>
                  We have chosen to incorporate carefully selected premium tools as helpful companions in your prayer journey. Our strict boundaries ensure that:
                </p>
                <ul className="space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>PrayerAssist only helps craft or refine a prayer after first listening to and understanding your personal intent, feelings, and the true issue on your heart. You are in control. PrayerAssist helps you find the words.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>All assistance is grounded in Scripture and aligned with historic, Bible-believing Christian faith.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Your private prayers, conversations, and personal data remain secure and protected.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Technology is used only to serve, never to replace, the intimate relationship between you and God.</span>
                  </li>
                </ul>
                <p>
                  We believe technology should support, not substitute, genuine faith. PrayerAssist.ing exists to help you pray more thoughtfully, understand Scripture more deeply, and stay consistent in your walk with Christ — always pointing you back to the living Word and the Holy Spirit as your true Guide.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ── Feedback Form ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <MessageSquare className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">Help Us Improve</h2>
                  <p className="text-muted-foreground text-sm mt-1">We value your voice — it shapes this ministry.</p>
                </div>
              </div>

              <RadioGroup
                value={feedbackType}
                onValueChange={setFeedbackType}
                className="flex gap-4 mb-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="feature_request" id="fr" />
                  <Label htmlFor="fr" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Lightbulb className="w-4 h-4 text-primary" /> Feature Request
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="improvement" id="imp" />
                  <Label htmlFor="imp" className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <TrendingUp className="w-4 h-4 text-primary" /> What can we do better
                  </Label>
                </div>
              </RadioGroup>

              {feedbackType === "feature_request" && (
                <div className="mb-4">
                  <Label htmlFor="ftitle" className="text-xs text-muted-foreground">Title (optional)</Label>
                  <Input
                    id="ftitle"
                    value={feedbackTitle}
                    onChange={e => setFeedbackTitle(e.target.value)}
                    placeholder="e.g. Audio prayer playlists"
                    maxLength={200}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="mb-4">
                <Label htmlFor="fmsg" className="text-xs text-muted-foreground">Your Message</Label>
                <Textarea
                  id="fmsg"
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  placeholder="Tell us what's on your heart…"
                  maxLength={2000}
                  className="mt-1 min-h-[120px] resize-y"
                />
              </div>

              <Button
                onClick={handleFeedbackSubmit}
                disabled={submittingFeedback || !feedbackMessage.trim()}
                className="w-full sm:w-auto"
              >
                {submittingFeedback ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" /> Submit Feedback
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* ── Study Sessions Explainer ── */}
        <motion.section
          id="sessions"
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-10 space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground font-serif">Study Sessions</h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                KeepRead.ing automatically tracks your Bible study sessions — every highlight,
                note, and annotation is grouped into a timeline you can review later.
                Sessions help you see the progression of your study and revisit past insights.
              </p>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                In iPad Study Mode, sessions are focused on specific passages you choose.
                In reading mode, sessions start automatically and track your journey across chapters.
              </p>
              {/* TODO: Expand with screenshots, video walkthrough, and FAQ */}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
