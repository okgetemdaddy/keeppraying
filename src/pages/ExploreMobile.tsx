/**
 * ExploreMobile — Community prayer discovery screen.
 * Brand sayings header, search, filter chips, CTA cards, warriors online.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSayingsCycle } from "@/hooks/useSayingsCycle";
import { useWarriorPresence } from "@/hooks/useWarriorPresence";
import { PrayerCardMobile } from "@/components/board/PrayerCardMobile";
import { Search, Star, Shield, Mic, PenLine, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FilterMode = "foryou" | "trending" | "answered" | "recent";

export default function ExploreMobile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentSaying, brandSaying } = useSayingsCycle();
  const { onlineWarriors, onlineCount } = useWarriorPresence();

  const [filter, setFilter] = useState<FilterMode>("foryou");
  const [searchQuery, setSearchQuery] = useState("");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("prayer_cards")
      .select("*")
      .eq("status", "approved")
      .eq("prayer_type", "community");

    if (searchQuery.trim()) {
      query = query.ilike("prayer_text", `%${searchQuery.trim()}%`);
    }

    switch (filter) {
      case "trending":
        query = query
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("prayed_count", { ascending: false });
        break;
      case "answered":
        query = supabase
          .from("prayer_cards")
          .select("*")
          .not("extended_prayer", "is", null)
          .eq("prayer_type", "community")
          .order("updated_at", { ascending: false });
        break;
      case "recent":
        query = query.order("created_at", { ascending: false });
        break;
      default: // foryou
        query = query.order("prayed_count", { ascending: false });
        break;
    }

    const { data } = await query.limit(20);
    setPrayers(data ?? []);
    setLoading(false);
  }, [filter, searchQuery]);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  const filters: { id: FilterMode; label: string }[] = [
    { id: "foryou", label: "For You" },
    { id: "trending", label: "Trending" },
    { id: "answered", label: "Answered" },
    { id: "recent", label: "Recent" },
  ];

  return (
    <div
      className="min-h-screen pb-28"
      style={{ backgroundColor: "var(--kp-bg-deep)", color: "var(--kp-text-body)" }}
    >
      {/* Brand Sayings Header */}
      <div className="px-5 pt-6 pb-2">
        <AnimatePresence mode="wait">
          <motion.h1
            key={brandSaying}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-gold)" }}
          >
            {brandSaying}
          </motion.h1>
        </AnimatePresence>
        <p className="text-xs mt-1" style={{ color: "var(--kp-text-muted)" }}>
          Discover what the community is praying
        </p>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
          style={{
            backgroundColor: "var(--kp-bg-elevated)",
            border: "1px solid var(--kp-border)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--kp-text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prayers…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              backgroundColor: filter === f.id ? "rgba(180,140,50,0.15)" : "var(--kp-bg-elevated)",
              color: filter === f.id ? "var(--kp-gold)" : "var(--kp-text-muted)",
              border: `1px solid ${filter === f.id ? "var(--kp-border-gold)" : "var(--kp-border)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Prayer Warriors Online */}
      {onlineCount > 0 && (
        <div className="px-5 pb-4">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              backgroundColor: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.15)",
            }}
          >
            {/* Pulse dot */}
            <span className="relative flex h-2.5 w-2.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: "rgba(34,197,94,0.6)" }}
                animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#22c55e" }} />
            </span>

            <Shield className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />

            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {onlineWarriors.slice(0, 4).map((w) => (
                <Avatar key={w.user_id} className="w-6 h-6 border-2" style={{ borderColor: "var(--kp-bg-deep)" }}>
                  <AvatarImage src={w.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] font-bold" style={{ background: "var(--kp-bg-elevated)", color: "var(--kp-gold)" }}>
                    {(w.full_name ?? "?")[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
              <strong>{onlineCount}</strong> Warrior{onlineCount !== 1 ? "s" : ""} Online
            </span>
          </div>
        </div>
      )}

      {/* PrayerAssist CTA */}
      <div className="px-5 pb-3">
        <button
          onClick={() => navigate("/assistant")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "rgba(180,140,50,0.08)",
            border: "1px solid var(--kp-border-gold)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(180,140,50,0.15)" }}
          >
            <Star className="w-5 h-5" style={{ color: "var(--kp-gold)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--kp-text-primary)" }}>
              Prayer Assist
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kp-text-muted)" }}>
              Need help putting your heart into words? Let us guide your prayer.
            </p>
          </div>
        </button>
      </div>

      {/* Request a Prayer CTA */}
      <div className="px-5 pb-5">
        <div
          className="w-full p-4 rounded-2xl"
          style={{
            backgroundColor: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
            >
              <Shield className="w-5 h-5" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kp-text-primary)" }}>
                Request a Prayer
              </p>
              <p className="text-xs" style={{ color: "var(--kp-text-muted)" }}>
                Our prayer warriors are standing by
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { icon: Type, label: "Type" },
              { icon: Mic, label: "Speak" },
              { icon: PenLine, label: "Draw" },
            ].map((m) => (
              <button
                key={m.label}
                onClick={() => {
                  toast({ title: "Coming soon", description: "Prayer request feature launching shortly." });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.96]"
                style={{
                  backgroundColor: "var(--kp-bg-elevated)",
                  color: "var(--kp-text-muted)",
                  border: "1px solid var(--kp-border)",
                }}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sayings toast */}
      <AnimatePresence>
        {currentSaying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: "var(--kp-bg-elevated)",
              color: "var(--kp-gold)",
              border: "1px solid var(--kp-border-gold)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
          >
            {currentSaying}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prayer Cards */}
      <div className="px-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--kp-gold)", borderTopColor: "transparent" }} />
          </div>
        ) : prayers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "var(--kp-text-muted)" }}>
              {searchQuery ? "No prayers found for that search." : "No community prayers yet. Be the first!"}
            </p>
          </div>
        ) : (
          prayers.map((p) => (
            <PrayerCardMobile
              key={p.id}
              prayer={p}
              isOwner={p.created_by === user?.id}
              userId={user?.id}
              initialFlipped={filter === "answered"}
              onRefresh={fetchPrayers}
            />
          ))
        )}
      </div>
    </div>
  );
}
