import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, LogOut, Menu, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { useSayingsCycle } from "@/hooks/useSayingsCycle";

/* ── Open-book SVG icon ── */
function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

/* ── User Menu (simplified for KeepRead.ing) ── */
function KRUserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/10 focus-visible:outline-none"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center text-white text-xs font-bold select-none shadow-sm">
          {initials}
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-foreground/50 transition-transform", open && "rotate-180")} />
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
              className="absolute right-0 top-full mt-2 w-48 z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-card overflow-hidden py-1"
            >
              {user?.email && (
                <p className="px-4 py-2 text-xs text-muted-foreground truncate border-b border-border mb-1">
                  {user.email}
                </p>
              )}
              <p className="px-4 py-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                Your KeepRead.ing login seamlessly works with{" "}
                <a href="https://keeppray.ing" className="text-primary hover:underline font-medium">KeepPray.ing</a>
              </p>
              <div className="border-t border-border my-1" />
              <a
                href="https://keeppray.ing/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              >
                <User className="w-4 h-4" />
                My Profile
              </a>
              <button
                onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}
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

interface KeepReadingNavProps {
  onOpenDrawer?: () => void;
}

export function KeepReadingNav({ onOpenDrawer }: KeepReadingNavProps) {
  const { session } = useAuth();
  const { currentSaying } = useSayingsCycle();

  return (
    <nav className="sticky top-0 z-50 transition-all duration-500 border-b bg-card/80 backdrop-blur-xl border-border shadow-card">
      <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2 min-w-0 max-w-[55%] sm:max-w-[400px]">
          {session && (
            <button
              onClick={onOpenDrawer}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
              aria-label="Prayer resources"
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2 min-w-0">
            <AnimatePresence mode="wait">
              {currentSaying ? (
                <motion.span
                  key={currentSaying}
                  initial={{ opacity: 0, y: 8, scale: 0.92, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, scale: 0.95, filter: "blur(3px)" }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="block font-display text-xs sm:text-sm italic tracking-wide leading-snug text-amber-600/90"
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
                  className="flex items-center gap-2"
                >
                  <BookIcon className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                    <span className="text-foreground">Keep</span>
                    <span className="nav-pray-glow">Read</span>
                    <span className="text-foreground">.ing</span>
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Right: auth area */}
        <div className="flex items-center gap-2">
          {session && <NotificationBell scrolled />}
          {session ? (
            <KRUserMenu />
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-foreground/70 hover:text-foreground px-4">
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
