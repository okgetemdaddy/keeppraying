import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X, LogOut, LayoutDashboard, ChevronDown, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Prayers", href: "/prayers" },
  { label: "Groups", href: "/groups" },
  { label: "Family", href: "/family" },
  { label: "Circles", href: "/circles" },
  { label: "Testify", href: "/testify" },
  { label: "PrayerAssist.ing", href: "/assistant" },
  { label: "Sermon Mode", href: "/sermon-sync" },
  { label: "KeepFight.ing", href: "/war-room" },
  { label: "Pray the World", href: "/pray-the-world" },
  { label: "KeepGrow.ing", href: "/blog" },
];

interface SiteNavProps {
  /** Start transparent and frost on scroll — for hero/landing pages */
  transparent?: boolean;
  /** Dark overlay style — for Board, WarRoom (dark bg pages) */
  dark?: boolean;
  /** Extra controls rendered on the right, before the user CTA */
  rightSlot?: ReactNode;
}

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
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  Admin Dashboard
                </Link>
              )}
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

export function SiteNav({ transparent = false, dark = false, rightSlot }: SiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!transparent);
  const { session, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!transparent) { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const handleMobileSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate("/");
  };

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

  const hamburgerClass = dark
    ? "text-white hover:bg-white/10"
    : scrolled
    ? "text-foreground hover:bg-muted"
    : "text-white hover:bg-white/10";

  const navBg = dark
    ? "bg-black/25 backdrop-blur-xl border-white/10"
    : scrolled
    ? "bg-card/80 backdrop-blur-xl border-border shadow-card"
    : "bg-transparent border-transparent";

  return (
    <nav className={cn("sticky top-0 z-50 transition-all duration-500 border-b", navBg)}>
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            <span className={cn("transition-colors duration-300", logoColor)}>Keep</span>
            <span className="nav-pray-glow">Pray</span>
            <span className={cn("transition-colors duration-300", logoColor)}>.ing</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              className={cn(
                "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                linkClass
              )}
            >
              {label}
              <span className="absolute bottom-1 left-3 right-3 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Page-specific controls */}
          {rightSlot}

          {/* Auth CTA — desktop only */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className={cn("md:hidden p-2 rounded-xl transition-colors", hamburgerClass)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
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
                  key={label}
                  to={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  {label}
                </Link>
              ))}

              <div className="pt-2 pb-1 space-y-2">
                {session ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="rounded-xl w-full gap-2">
                          <ShieldCheck className="w-4 h-4 text-gold" /> Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    <Link to="/board" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="rounded-xl w-full gap-2">
                        <LayoutDashboard className="w-4 h-4" /> My Board
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="rounded-xl w-full gap-2 text-destructive hover:bg-destructive/10"
                      onClick={handleMobileSignOut}
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button className="btn-gold rounded-xl w-full gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
