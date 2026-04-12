/**
 * DesktopNav — Horizontal top navigation bar for 768px+ viewports.
 * Logo | Board | Explore | Circles | (spacer) | Search | Bell | Avatar
 */

import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { id: "board", label: "Board", path: "/boardv2", match: (p: string) => p === "/boardv2" || p === "/" },
  { id: "explore", label: "Explore", path: "/explore", match: (p: string) => p === "/explore" || p === "/prayers" || p.startsWith("/prayer/") },
  { id: "circles", label: "Circles", path: "/circles-mobile", match: (p: string) => p.startsWith("/circles") },
];

export function DesktopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });
  }, [user]);

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-1 px-6 h-14"
      style={{
        background: "linear-gradient(to bottom, rgba(10,9,8,0.98), rgba(20,18,13,0.92))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--kp-border)",
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        className="font-bold text-base mr-6 tracking-tight"
        style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-gold)" }}
      >
        KeepPray.ing
      </button>

      {/* Nav links */}
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="relative px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: active ? "var(--kp-gold)" : "var(--kp-text-muted)" }}
          >
            {item.label}
            {active && (
              <motion.div
                layoutId="desktop-nav-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: "var(--kp-gold)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <NotificationBell dark scrolled={false} />

      <button
        onClick={() => navigate("/profile")}
        className="ml-2"
      >
        <Avatar className="w-8 h-8 border" style={{ borderColor: "var(--kp-border-gold)" }}>
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback
            className="text-[10px] font-bold"
            style={{ background: "var(--kp-bg-elevated)", color: "var(--kp-gold)" }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>
    </nav>
  );
}
