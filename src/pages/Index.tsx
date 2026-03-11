import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, useScroll, useTransform, type Variants, AnimatePresence } from "framer-motion";
import {
  Sparkles, BookOpen, Shield, Heart, ArrowRight, HandMetal, Send, Loader2, Bot,
  Search, Menu, X, ChevronDown, Mail, Twitter, Facebook, Instagram, Cross
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import VerseLink from "@/components/VerseLink";
import heroBg from "@/assets/hero-bg.jpg";
import heroVideo from "@/assets/hero-video.mp4";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};
const navItem: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Contact Form ─────────────────────────────────────────────────────────────
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
        method: "POST", headers,
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="prayer-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Bot className="w-4 h-4" /> Response from KeepPray.ing
        </div>
        <div className="prose prose-sm max-w-none text-foreground/80 [&_p]:mb-2">
          <ReactMarkdown>{aiReply}</ReactMarkdown>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => { setSubmitted(false); setAiReply(""); }}>
          Send another message
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="prayer-card p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_PRAYERS = [
  { title: "The Lord's Prayer", preview: "Our Father in heaven, hallowed be your name. Your kingdom come, your will be done…", likes: 847, prayed: 2103, tags: ["lords-prayer", "foundational"], color: "from-amber-50 to-yellow-50" },
  { title: "A Prayer of Peace", preview: "Lord, I come to You casting every anxiety at Your feet. Guard my heart and mind with Your peace…", likes: 634, prayed: 1587, tags: ["peace", "philippians"], color: "from-emerald-50 to-teal-50" },
  { title: "Morning Surrender", preview: "Good morning, Father. Before this day begins, I lay it at Your feet. Guide every thought, word, and step…", likes: 671, prayed: 1432, tags: ["morning-prayer", "surrender"], color: "from-sky-50 to-blue-50" },
];

const NAV_LINKS = [
  { label: "Prayers", href: "/prayers" },
  { label: "PrayerAssist.ing", href: "/assistant" },
  { label: "KeepFight.ing", href: "/war-room" },
  { label: "KeepGrow.ing", href: "/blog" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Index() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const navigate = useNavigate();
  const { session } = useAuth();
  const heroRef = useRef<HTMLElement>(null);

  // Seamless video crossfade
  const vidA = useRef<HTMLVideoElement>(null);
  const vidB = useRef<HTMLVideoElement>(null);
  const [activeVid, setActiveVid] = useState<"a" | "b">("a");
  const CROSSFADE_BEFORE = 2.5; // seconds before end to start crossfade

  const handleTimeUpdate = useCallback((current: "a" | "b") => {
    const vid = current === "a" ? vidA.current : vidB.current;
    const next = current === "a" ? vidB.current : vidA.current;
    if (!vid || !next || !vid.duration) return;
    const remaining = vid.duration - vid.currentTime;
    if (remaining <= CROSSFADE_BEFORE && next.paused) {
      next.currentTime = 0;
      next.play().catch(() => {});
      setActiveVid(current === "a" ? "b" : "a");
    }
  }, []);

  // Parallax
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  // Nav scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/prayers?q=${encodeURIComponent(searchVal.trim())}`);
    else navigate("/prayers");
  };


  return (
    <div className="min-h-screen bg-background">

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-card/80 backdrop-blur-xl border-b border-border shadow-card"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 group">
            <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              <span className={`transition-colors duration-300 ${scrolled ? "text-foreground" : "text-white"}`}>Keep</span>
              <span className="nav-pray-glow">Pray</span>
              <span className={`transition-colors duration-300 ${scrolled ? "text-foreground" : "text-white"}`}>.ing</span>
            </span>
          </Link>

          {/* Desktop links */}
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            className="hidden md:flex items-center gap-1"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <motion.div key={label} variants={navItem}>
                <Link
                  to={href}
                  className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group
                    ${scrolled ? "text-foreground/70 hover:text-foreground hover:bg-muted" : "text-white/75 hover:text-white hover:bg-white/10"}`}
                >
                  {label}
                  <span className="absolute bottom-1 left-3 right-3 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <Link to="/board">
                <Button size="sm" variant="ghost" className={`rounded-xl text-sm ${scrolled ? "" : "text-white hover:bg-white/10"}`}>
                  My Board
                </Button>
              </Link>
            ) : null}
            <Link to="/auth">
              <Button size="sm" className="btn-gold rounded-xl gap-1.5 divine-glow px-5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 space-y-1">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={label} to={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <div className="pt-2 pb-1">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button className="btn-gold rounded-xl w-full gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax background — dual-video crossfade for seamless looping */}
        <motion.div style={{ y: bgY }} className="absolute inset-0 scale-110">
          {/* Video A */}
          <video
            ref={vidA}
            autoPlay
            muted
            playsInline
            poster={heroBg}
            onTimeUpdate={() => handleTimeUpdate("a")}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-[1200ms]"
            style={{ opacity: activeVid === "a" ? 1 : 0 }}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Video B (crossfade target) */}
          <video
            ref={vidB}
            muted
            playsInline
            onTimeUpdate={() => handleTimeUpdate("b")}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-[1200ms]"
            style={{ opacity: activeVid === "b" ? 1 : 0 }}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Fallback still if video unavailable */}
          <img src={heroBg} aria-hidden className="absolute inset-0 w-full h-full object-cover object-center -z-10" />
        </motion.div>

        {/* Layered overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gold/10 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1.5s" }} />

        <motion.div
          style={{ opacity: heroOpacity }}
          initial="hidden" animate="show" variants={stagger}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto space-y-6 sm:space-y-8"
        >
          <motion.p variants={fadeUp} className="text-white/55 text-xs sm:text-sm tracking-[0.35em] uppercase font-body">
            Welcome to
          </motion.p>

          <motion.h1 variants={fadeUp} className="font-display font-bold leading-none tracking-tight text-white">
            <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
              Keep
              <span className="relative inline-block">
                <span className="hero-pray-glow">Pray</span>
                {/* Gold shimmer underline */}
                <span
                  className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(42 85% 54%), transparent)" }}
                />
              </span>
              .ing
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="font-display italic text-white/80 text-base sm:text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed px-2">
            "Do not be anxious about anything, but in every situation,<br className="hidden sm:block" /> by prayer and petition, with thanksgiving, present your requests to God."
          </motion.p>

          <motion.p variants={fadeUp} className="text-white/45 text-xs sm:text-sm flex items-center justify-center gap-1.5">
            <VerseLink reference="Philippians 4:6" text="Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." className="text-white/45 [&_.verse-text]:text-white/45" />
          </motion.p>

          {/* Search bar */}
          <motion.form variants={fadeUp} onSubmit={handleSearch} className="relative max-w-md mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-gold transition-colors z-10" />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Find a prayer…"
                className="w-full h-12 pl-11 pr-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60 focus:bg-white/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-xl bg-gold/90 text-white text-xs font-medium hover:bg-gold transition-colors"
              >
                Search
              </button>
            </div>
          </motion.form>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link to="/prayers">
              <Button size="lg" className="btn-gold rounded-2xl h-12 px-8 text-base gap-2 w-full sm:w-auto shadow-[0_8px_32px_-8px_hsl(42_85%_46%/0.6)]">
                Explore Prayers <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/assistant">
              <Button
                size="lg"
                className="rounded-2xl h-12 px-8 text-base gap-2 w-full sm:w-auto bg-white/15 backdrop-blur-sm border border-white/35 text-white hover:bg-white/25 hover:border-white/55 transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(0_0%_100%/0.15)]"
              >
                <Sparkles className="w-4 h-4 text-gold" /> PrayerAssist.ing
              </Button>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            variants={fadeUp}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30"
          >
            <span className="text-xs tracking-widest uppercase">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Lord's Prayer Verse ───────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-divine relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(42 85% 46% / 0.12) 0%, transparent 60%), radial-gradient(circle at 70% 50%, hsl(150 38% 26% / 0.08) 0%, transparent 60%)" }} />
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6 relative">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-8 font-body">
              Matthew 6:9–13
            </p>
            <div className="space-y-4 font-display text-lg sm:text-xl leading-loose text-foreground">
              {[
                "Our Father in heaven, hallowed be your name.",
                "Your kingdom come, your will be done, on earth as it is in heaven.",
                "Give us this day our daily bread, and forgive us our debts, as we also have forgiven our debtors.",
                "And lead us not into temptation, but deliver us from evil.",
              ].map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.18, duration: 0.7 }}
                  viewport={{ once: true }}
                  className={i % 2 === 0 ? "text-foreground font-semibold" : "text-muted-foreground italic font-normal"}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Community Prayers ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10 sm:mb-14">
            <motion.p
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-xs uppercase tracking-widest text-muted-foreground mb-2"
            >
              Beloved by thousands
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl sm:text-4xl font-bold mb-3"
            >
              Community Prayers
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-muted-foreground"
            >
              Prayers prayed by thousands of believers worldwide
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {SEED_PRAYERS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.65 }}
                viewport={{ once: true }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className={`prayer-card p-6 space-y-4 flex flex-col relative overflow-hidden bg-gradient-to-br ${p.color} border border-border/60`}
              >
                {/* Subtle corner glow */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-40" style={{ background: "hsl(42 85% 46% / 0.15)" }} />
                <h3 className="font-display text-lg font-semibold relative">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-4 italic font-display relative">{p.preview}</p>
                <div className="flex flex-wrap gap-1.5 relative">
                  {p.tags.map(t => <span key={t} className="tag-pill">#{t}</span>)}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50 relative">
                  <motion.span
                    className="flex items-center gap-1.5 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart className="w-3.5 h-3.5 text-destructive" />
                    <span className="font-medium">{p.likes.toLocaleString()}</span>
                  </motion.span>
                  <motion.span
                    className="flex items-center gap-1.5 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <HandMetal className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{p.prayed.toLocaleString()} prayed</span>
                  </motion.span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-10"
          >
            <Link to="/prayers">
              <Button className="btn-gold rounded-xl gap-2 px-8 h-11">
                See All Prayers <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(42 85% 46% / 0.07) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(150 38% 26% / 0.07) 0%, transparent 50%)" }} />
        <div className="container mx-auto px-4 max-w-5xl relative">
          <div className="text-center mb-12 sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65 }}
              className="font-display text-3xl sm:text-4xl font-bold"
            >
              Everything for your prayer life
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-muted-foreground mt-3"
            >
              Tools crafted to deepen your walk with God
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: BookOpen, title: "Prayer Board",
                desc: "Save, organize, and revisit your favourite prayers. Build playlists and track your journey.",
                link: "/board", colorClass: "text-forest", bgClass: "bg-forest/10", hoverGlow: "hsl(150 38% 26% / 0.2)"
              },
              {
                icon: Sparkles, title: "PrayerAssist.ing",
                desc: "Your AI prayer companion — answers Bible questions, crafts prayers, and provides biblical guidance.",
                link: "/assistant", colorClass: "text-primary", bgClass: "bg-primary/10", hoverGlow: "hsl(42 75% 46% / 0.25)"
              },
              {
                icon: Shield, title: "KeepFight.ing",
                desc: "An immersive prayer sanctuary with ambient music, themes, and focused playlist mode.",
                link: "/war-room", colorClass: "text-gold", bgClass: "bg-gold/10", hoverGlow: "hsl(42 85% 46% / 0.25)"
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className="prayer-card p-6 sm:p-7 space-y-4 text-center group relative"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: `inset 0 0 40px ${f.hoverGlow}` }}
                />
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`w-14 h-14 rounded-2xl ${f.bgClass} flex items-center justify-center mx-auto ${f.colorClass}`}
                >
                  <f.icon className="w-7 h-7" />
                </motion.div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <Link to={f.link} className={`inline-flex items-center gap-1.5 text-sm font-medium ${f.colorClass} hover:underline`}>
                  Explore <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-divine" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse at center, hsl(42 85% 46% / 0.18) 0%, transparent 70%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="container mx-auto px-4 max-w-2xl text-center space-y-6 relative"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your journey begins</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">Begin your prayer journey</h2>
          <p className="verse-text text-base sm:text-lg">
            "The prayer of a righteous person is powerful and effective." —{" "}
            <VerseLink reference="James 5:16" text="The prayer of a righteous person is powerful and effective." />
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link to="/auth">
              <Button size="lg" className="btn-gold rounded-2xl h-13 px-12 text-base gap-2 shadow-[0_8px_40px_-8px_hsl(42_85%_46%/0.5)]">
                Start Praying Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Contact Form ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Get in Touch</h2>
            <p className="text-muted-foreground text-sm">Questions, feedback, or prayer requests — we'd love to hear from you.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">

            {/* Brand col */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div>
                <span className="font-display text-2xl font-bold">
                  Keep<span className="text-gold">Pray</span>.ing
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                A sacred space for daily prayer, reflection, and spiritual growth — available to all who seek.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3 pt-1">
                {[
                  { icon: Twitter, label: "Twitter", href: "#" },
                  { icon: Facebook, label: "Facebook", href: "#" },
                  { icon: Instagram, label: "Instagram", href: "#" },
                ].map(({ icon: Icon, label, href }) => (
                  <motion.a
                    key={label} href={href} aria-label={label}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-9 h-9 rounded-xl bg-muted hover:bg-gold/15 hover:text-gold flex items-center justify-center text-muted-foreground transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">Explore</h4>
              <ul className="space-y-2.5">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-sm text-muted-foreground hover:text-gold transition-colors duration-200 flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-gold/40 group-hover:bg-gold transition-colors" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">Resources</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Board", href: "/board" },
                { label: "PrayerAssist.ing", href: "/assistant" },
                  { label: "KeepFight.ing", href: "/war-room" },
                  { label: "Bible Games", href: "/games" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-sm text-muted-foreground hover:text-gold transition-colors duration-200 flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-gold/40 group-hover:bg-gold transition-colors" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Verse + contact */}
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground">Daily Word</h4>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
                viewport={{ once: true }}
                className="p-4 rounded-2xl bg-gradient-divine border border-gold/20 space-y-2"
              >
                <p className="font-display italic text-sm text-foreground/80 leading-relaxed">
                  "Pray without ceasing."
                </p>
                <p className="text-xs text-muted-foreground">
                  <VerseLink reference="1 Thessalonians 5:17" text="Pray without ceasing." />
                </p>
              </motion.div>
              <Link to="/auth" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors">
                <Mail className="w-3.5 h-3.5" /> Get in touch
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} KeepPray.ing — All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Built with <Heart className="w-3 h-3 text-destructive fill-destructive" /> for every believer
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
