/**
 * MobileNavV2 — 5-slot bottom navigation matching the mockup exactly.
 * Board | Explore | + (Pray) | Circles | Profile
 */

import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PrayNowSheet } from "@/components/PrayNowSheet";
import { useState } from "react";

interface Props {
  onPrayerCreated?: () => void;
}

export function MobileNavV2({ onPrayerCreated }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [prayOpen, setPrayOpen] = useState(false);
  const path = location.pathname;

  const tabs = [
    {
      id: "board",
      label: "Board",
      path: "/boardv2",
      match: (p: string) => p === "/boardv2" || p === "/",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
          stroke={active ? "var(--kp-gold)" : "var(--kp-text-muted)"}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: "explore",
      label: "Explore",
      path: "/prayers",
      match: (p: string) => p === "/prayers" || p.startsWith("/prayer/"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
          stroke={active ? "var(--kp-gold)" : "var(--kp-text-muted)"}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    { id: "pray", label: "", path: "", match: () => false, icon: () => null },
    {
      id: "circles",
      label: "Circles",
      path: "/circles",
      match: (p: string) => p.startsWith("/circles"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
          stroke={active ? "var(--kp-gold)" : "var(--kp-text-muted)"}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      path: "/profile",
      match: (p: string) => p.startsWith("/profile"),
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
          stroke={active ? "var(--kp-gold)" : "var(--kp-text-muted)"}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 z-[100] pb-[env(safe-area-inset-bottom)]"
        style={{
          height: "var(--kp-nav-height)",
          background: "linear-gradient(to top, rgba(10,9,8,0.98), rgba(20,18,13,0.92))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--kp-border)",
        }}
      >
        {tabs.map((tab) => {
          if (tab.id === "pray") {
            return (
              <button
                key="pray"
                onClick={() => setPrayOpen(true)}
                className="flex items-center justify-center rounded-full active:scale-[0.92] transition-transform"
                style={{
                  width: 52,
                  height: 52,
                  marginTop: -16,
                  background: "linear-gradient(135deg, var(--kp-gold), #b8942f)",
                  boxShadow: "0 4px 20px -2px rgba(180,140,50,0.4), 0 0 40px rgba(180,140,50,0.15)",
                }}
                aria-label="Pray Now"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="#1a1610">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            );
          }

          const isActive = tab.match(path);

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-[3px] py-1.5 px-3 rounded-[14px] relative"
              style={{ minWidth: 52 }}
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="kp-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: "var(--kp-gold)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {tab.icon(isActive)}
              <span
                className="text-[10px] font-semibold tracking-[0.02em]"
                style={{ color: isActive ? "var(--kp-gold)" : "var(--kp-text-muted)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <PrayNowSheet
        open={prayOpen}
        onOpenChange={setPrayOpen}
        onPrayerCreated={onPrayerCreated}
      />
    </>
  );
}
