import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, type Variants } from "framer-motion";
import { Sparkles, BookOpen, Shield, Heart, ArrowRight, HandMetal, Send, Loader2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import VerseLink from "@/components/VerseLink";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    if (trimmed.length < 2) { toast({ title: "Message too short", variant: "destructive" }); return; }

    setSending(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/contact-form`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null, message: trimmed }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send");
      setAiReply(data.ai_reply || "");
      setSubmitted(true);
      setName(""); setEmail(""); setMessage("");
    } catch (e) {
      toast({ title: "Failed to send", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="prayer-card p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Bot className="w-4 h-4" />
          Response from KeepPray.ing
        </div>
        <div className="prose prose-sm max-w-none text-foreground/80 [&_p]:mb-2">
          <ReactMarkdown>{aiReply}</ReactMarkdown>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => { setSubmitted(false); setAiReply(""); }}
        >
          Send another message
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="prayer-card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" maxLength={100} />
        <Input placeholder="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl" maxLength={255} />
      </div>
      <Textarea placeholder="Your message or prayer request…" value={message} onChange={e => setMessage(e.target.value)} rows={4} className="rounded-xl resize-none" required maxLength={1000} />
      <p className="text-xs text-muted-foreground text-right -mt-2">{message.length}/1000</p>
      <Button type="submit" disabled={sending || !message.trim()} className="btn-gold rounded-xl w-full gap-2">
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Getting AI response…</> : <><Send className="w-4 h-4" />Send Message</>}
      </Button>
    </form>
  );
}
import heroBg from "@/assets/hero-bg.jpg";
import haloPng from "@/assets/halo.png";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, type: "tween" } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const SEED_PRAYERS = [
  { title: "The Lord's Prayer", preview: "Our Father in heaven, hallowed be your name. Your kingdom come, your will be done…", likes: 847, prayed: 2103, tags: ["lords-prayer","foundational"] },
  { title: "A Prayer of Peace", preview: "Lord, I come to You casting every anxiety at Your feet. Guard my heart and mind with Your peace…", likes: 634, prayed: 1587, tags: ["peace","philippians"] },
  { title: "Morning Surrender", preview: "Good morning, Father. Before this day begins, I lay it at Your feet. Guide every thought, word, and step…", likes: 671, prayed: 1432, tags: ["morning-prayer","surrender"] },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-foreground">KeepPray.ing</span>
          <div className="flex items-center gap-2">
            <Link to="/prayers" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Prayers</Link>
            <Link to="/assistant" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">PrayerAssist</Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Blog</Link>
            <Link to="/auth"><Button size="sm" className="btn-gold rounded-xl">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="Prayer landscape at sunrise" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <motion.div initial="hidden" animate="show" variants={stagger} className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
          <motion.p variants={fadeUp} className="text-white/60 text-sm tracking-[0.3em] uppercase font-body">Welcome to</motion.p>
          <motion.h1 variants={fadeUp} className="font-display text-6xl sm:text-7xl md:text-8xl font-bold text-white leading-none relative">
            Keep
            <span className="relative inline-block text-gold mx-[0.04em]">
              <motion.img
                src={haloPng}
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: -14 }}
                transition={{ delay: 0.9, duration: 1, type: "spring", stiffness: 100, damping: 14 }}
                className="absolute pointer-events-none select-none"
                style={{
                  width: "115%",
                  top: "-72%",
                  left: "-7.5%",
                  filter: "drop-shadow(0 0 22px rgba(212,168,67,0.9)) drop-shadow(0 0 8px rgba(255,235,130,0.7)) drop-shadow(0 0 40px rgba(212,168,67,0.4))",
                  zIndex: 1,
                }}
              />
              <span className="relative" style={{ zIndex: 2 }}>Pray</span>
            </span>
            .ing
          </motion.h1>
          <motion.p variants={fadeUp} className="font-display italic text-white/80 text-lg sm:text-2xl max-w-2xl mx-auto leading-relaxed px-2">
            "But when you pray, go into your room, close the door<br className="hidden sm:block" /> and pray to your Father, who is unseen."
          </motion.p>
          <motion.p variants={fadeUp} className="text-white/50 text-sm flex items-center justify-center gap-1.5">
            <VerseLink reference="Matthew 6:6" text="But when you pray, go into your room, close the door and pray to your Father, who is unseen." className="text-white/50 [&_.verse-text]:text-white/50" />
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/prayers"><Button size="lg" className="btn-gold rounded-2xl h-12 px-6 sm:px-8 text-base gap-2 w-full sm:w-auto">Explore Prayers <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/assistant"><Button size="lg" variant="outline" className="rounded-2xl h-12 px-6 sm:px-8 text-base gap-2 border-white/25 text-white hover:bg-white/10 w-full sm:w-auto"><Sparkles className="w-4 h-4" /> PrayerAssist AI</Button></Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Lord's Prayer Verse */}
      <section className="py-20 bg-gradient-divine">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-6">Matthew 6:9–13</p>
            <div className="space-y-3 font-display text-lg sm:text-xl leading-relaxed text-foreground">
              {["Our Father in heaven, hallowed be your name.", "Your kingdom come, your will be done, on earth as it is in heaven.", "Give us this day our daily bread, and forgive us our debts, as we also have forgiven our debtors.", "And lead us not into temptation, but deliver us from evil."].map((line, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15, duration: 0.6 }} viewport={{ once: true }} className={i % 2 === 0 ? "text-foreground" : "text-muted-foreground italic"}>{line}</motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Prayers */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold mb-2">Community Prayers</h2>
            <p className="text-muted-foreground">Prayers prayed by thousands of believers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SEED_PRAYERS.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6 }} viewport={{ once: true }} className="prayer-card p-6 space-y-4 flex flex-col">
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-4 italic font-display">{p.preview}</p>
                <div className="flex flex-wrap gap-1.5">{p.tags.map(t => <span key={t} className="tag-pill">#{t}</span>)}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likes.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><HandMetal className="w-3 h-3" />{p.prayed.toLocaleString()} prayed</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/prayers"><Button className="btn-gold rounded-xl gap-2 px-8">See All Prayers <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Everything for your prayer life</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Prayer Board", desc: "Save, organize, and revisit your favourite prayers. Build playlists and track your prayer journey.", link: "/board", color: "text-forest" },
              { icon: Sparkles, title: "PrayerAssist AI", desc: "Your AI prayer companion — answers Bible questions, helps craft prayers, and provides biblical guidance.", link: "/assistant", color: "text-primary" },
              { icon: Shield, title: "The War Room", desc: "An immersive prayer sanctuary with ambient music, themes, and a focused playlist mode.", link: "/war-room", color: "text-gold" },
            ].map(f => (
              <motion.div key={f.title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="prayer-card p-6 space-y-3 text-center group hover:border-primary/20 border border-transparent">
                <div className={`w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto ${f.color}`}><f.icon className="w-6 h-6" /></div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
                <Link to={f.link} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Explore <ArrowRight className="w-3 h-3" /></Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-divine text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }} className="container mx-auto px-4 max-w-xl space-y-5">
          <h2 className="font-display text-4xl font-bold">Begin your prayer journey</h2>
          <p className="verse-text">"The prayer of a righteous person is powerful and effective." — <VerseLink reference="James 5:16" text="The prayer of a righteous person is powerful and effective." /></p>
          <Link to="/auth"><Button size="lg" className="btn-gold rounded-2xl h-12 px-10 text-base gap-2">Start Praying <ArrowRight className="w-4 h-4" /></Button></Link>
        </motion.div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold mb-2">Get in Touch</h2>
            <p className="text-muted-foreground text-sm">Questions, feedback, or prayer requests — we'd love to hear from you.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-display font-semibold text-foreground">KeepPray.ing</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {[["Prayers","/prayers"],["PrayerAssist","/assistant"],["War Room","/war-room"],["Games","/games"],["Blog","/blog"]].map(([l,h])=>(
              <Link key={l} to={h} className="hover:text-foreground transition-colors">{l}</Link>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1">"Pray without ceasing." — <VerseLink reference="1 Thessalonians 5:17" text="Pray without ceasing." /></p>
        </div>
      </footer>
    </div>
  );
}
