import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, LogOut, LayoutDashboard, ChevronDown, ShieldCheck, User,
  MoreHorizontal, Globe, Sparkles, BookOpen, Users, Home, Swords,
  Radio, Heart, HandHeart, Wind, HeartHandshake
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSayingsCycle } from "@/hooks/useSayingsCycle";

/* ── Core visible links (desktop top bar) ── */
const CORE_LINKS = [
  { label: "Prayers", href: "/prayers", icon: BookOpen },
  { label: "Breathe", href: "/breathe", icon: Wind },
  { label: "Testify", href: "/testify", icon: HeartHandshake },
];

/* ── "More" dropdown items ── */
const MORE_LINKS = [
  { label: "We Pray", href: "/we-pray", icon: Globe, description: "Pray for the world together" },
  { label: "PrayerAssist.ing", href: "/assistant", icon: Sparkles, description: "AI-guided prayer crafting" },
  { label: "Circles", href: "/circles", icon: Users, description: "Prayer groups & accountability" },
  { label: "Family", href: "/family", icon: Home, description: "Family prayer rooms" },
  { label: "KeepFight.ing", href: "/war-room", icon: Swords, description: "Spiritual warfare room" },
  { label: "Sermon Mode", href: "/sermon-sync", icon: Radio, description: "Live sermon prayer sync" },
  { label: "KeepGrow.ing", href: "/blog", icon: BookOpen, description: "Faith articles & devotionals" },
  { label: "Support Us", href: "/support", icon: Heart, description: "Partner with this ministry" },
];

interface SiteNavProps {
  transparent?: boolean;
  dark?: boolean;
  rightSlot?: ReactNode;
}

/* ── User Menu ── */
function UserMenu({ dark, scrolled }: { dark?: boolean; scrolled?: boolean }) {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string)
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const chevronColor = dark
    ? "text-white/50"
    : scrolled
    ? "text-foreground/50"
    : "text-white/50";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10 focus-visible:outline-none"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-white text-xs font-bold select-none shadow-sm">
          {initials}
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", chevronColor, open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-card overflow-hidden py-1"
            >
              {user?.email && (
                <p className="px-4 py-2 text-xs text-muted-foreground truncate border-b border-border mb-1">
                  {user.email}
                </p>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Admin Dashboard
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                to="/board"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                My Board
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── More Dropdown ── */
function MoreDropdown({ dark, scrolled }: { dark?: boolean; scrolled?: boolean }) {
  const [open, setOpen] = useState(false);

  const triggerClass = dark
    ? "text-white/70 hover:text-white hover:bg-white/10"
    : scrolled
    ? "text-foreground/70 hover:text-foreground hover:bg-muted"
    : "text-white/75 hover:text-white hover:bg-white/10";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
          triggerClass
        )}
        aria-label="More features"
      >
        <MoreHorizontal className="w-4 h-4" />
        More
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl border border-white/20 bg-white/90 backdrop-blur-2xl overflow-hidden py-2 shadow-xl"
              style={{ boxShadow: "var(--shadow-lift)" }}
            >
              {MORE_LINKS.map(({ label, href, icon: Icon, description }) => (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-primary/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/8 group-hover:bg-primary/14 transition-colors mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main SiteNav ── */
export function SiteNav({ transparent = false, dark = false, rightSlot }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(!transparent);
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const { currentSaying } = useSayingsCycle();

  useEffect(() => {
    if (!transparent) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const logoColor = dark
    ? "text-white"
    : scrolled
    ? "text-foreground"
    : "text-white";

  const linkClass = dark
    ? "text-white/70 hover:text-white hover:bg-white/10"
    : scrolled
    ? "text-foreground/70 hover:text-foreground hover:bg-muted"
    : "text-white/75 hover:text-white hover:bg-white/10";

  const navBg = dark
    ? "bg-black/25 backdrop-blur-xl border-white/10"
    : scrolled
    ? "bg-card/80 backdrop-blur-xl border-border shadow-card"
    : "bg-transparent border-transparent";

  return (
    <nav className={cn("sticky top-0 z-50 transition-all duration-500 border-b", navBg)}>
      <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo — periodically morphs into a KeepPray.ing saying */}
        <Link to="/" className="flex-shrink-0 min-w-0 max-w-[55%] sm:max-w-[340px]">
          <AnimatePresence mode="wait">
            {currentSaying ? (
              <motion.span
                key={currentSaying}
                initial={{ opacity: 0, y: 8, scale: 0.92, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, scale: 0.95, filter: "blur(3px)" }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={cn(
                  "block font-display text-xs sm:text-sm italic tracking-wide leading-snug",
                  dark ? "text-amber-200/90" : scrolled ? "text-amber-600/90" : "text-amber-200/90"
                )}
              >
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="mr-1"
                >
                  ✦
                </motion.span>
                {currentSaying}
              </motion.span>
            ) : (
              <motion.span
                key="logo"
                initial={{ opacity: 0, y: -6, scale: 0.95, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 6, scale: 0.92, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="block font-display text-xl sm:text-2xl font-bold tracking-tight"
              >
                <span className={cn("transition-colors duration-300", logoColor)}>Keep</span>
                <span className="nav-pray-glow">Pray</span>
                <span className={cn("transition-colors duration-300", logoColor)}>.ing</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Desktop: core links + More dropdown */}
        {!isMobile && (
          <div className="flex items-center gap-1">
            {CORE_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                to={href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                  linkClass
                )}
              >
                {label}
                <span className="absolute bottom-1 left-3 right-3 h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>
            ))}
            <MoreDropdown dark={dark} scrolled={scrolled} />
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {rightSlot}

          {/* Desktop auth area */}
          {!isMobile && (
            <div className="flex items-center gap-1">
              {session && <NotificationBell dark={dark} scrolled={scrolled} />}
              {session ? (
                <UserMenu dark={dark} scrolled={scrolled} />
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="btn-gold rounded-xl gap-1.5 divine-glow px-5">
                    Get Started <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Mobile: just notification bell — no hamburger, we have bottom tabs + FAB */}
          {isMobile && session && <NotificationBell dark={dark} scrolled={scrolled} />}
          {isMobile && !session && (
            <Link to="/auth">
              <Button size="sm" className="btn-gold rounded-xl gap-1.5 px-4 text-xs">
                Get Started <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
