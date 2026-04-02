import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Wind, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { isKeepReading } from "@/lib/hostDetect";

const TABS = [
  { id: "prayers", label: "Prayers", icon: BookOpen, path: "/prayers" },
  { id: "breathe", label: "Breathe", icon: Wind, path: "/breathe" },
  { id: "testify", label: "Testify", icon: HeartHandshake, path: "/testify" },
] as const;

export function MobileTabBar() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("bible-dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const show = () => setHidden(false);
    const hide = () => setHidden(true);
    window.addEventListener("tabbar:hide", hide);
    window.addEventListener("tabbar:show", show);
    return () => {
      window.removeEventListener("tabbar:hide", hide);
      window.removeEventListener("tabbar:show", show);
    };
  }, []);

  if (!isMobile || hidden || isKeepReading()) return null;

  const currentPath = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "linear-gradient(180deg, hsl(38 60% 97% / 0.92) 0%, hsl(38 60% 97% / 0.98) 100%)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        borderTop: "1px solid hsl(38 22% 88% / 0.7)",
        boxShadow: "0 -2px 20px -4px hsl(25 35% 14% / 0.08)",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-6">
        {TABS.map((tab) => {
          const isActive = currentPath === tab.path ||
            (tab.path === "/prayers" && (currentPath === "/" || currentPath.startsWith("/prayer")));
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full focus:outline-none"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: "hsl(42 85% 46%)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </motion.div>

              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}