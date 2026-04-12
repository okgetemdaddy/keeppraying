/**
 * CirclesMobile — Prayer Circles discovery and management screen.
 * Shows the user's circles with activity snippets and member avatars.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Users, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CircleRow {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  created_by: string;
  created_at: string;
  memberCount: number;
  members: { user_id: string; full_name: string | null; avatar_url: string | null }[];
  latestActivity: string | null;
}

const CIRCLE_EMOJIS = ["🙏", "✝️", "🕊️", "💛", "🔥", "⛪", "📖", "🌿"];

export default function CirclesMobile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Get circles the user belongs to
      const { data: memberships } = await supabase
        .from("accountability_circle_members")
        .select("circle_id")
        .eq("user_id", user.id);

      if (!memberships?.length) {
        setCircles([]);
        setLoading(false);
        return;
      }

      const circleIds = memberships.map((m) => m.circle_id);

      // Get circle details
      const { data: circleData } = await supabase
        .from("accountability_circles")
        .select("*")
        .in("id", circleIds);

      // Get members for each circle (with profiles)
      const { data: allMembers } = await supabase
        .from("accountability_circle_members")
        .select("circle_id, user_id")
        .in("circle_id", circleIds);

      // Get member profiles
      const memberIds = [...new Set((allMembers ?? []).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", memberIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      // Get latest activity per circle
      const { data: latestPrayers } = await supabase
        .from("accountability_circle_prayers")
        .select("circle_id, created_at")
        .in("circle_id", circleIds)
        .order("created_at", { ascending: false });

      const latestMap = new Map<string, string>();
      (latestPrayers ?? []).forEach((p) => {
        if (!latestMap.has(p.circle_id)) latestMap.set(p.circle_id, p.created_at);
      });

      const rows: CircleRow[] = (circleData ?? []).map((c) => {
        const members = (allMembers ?? [])
          .filter((m) => m.circle_id === c.id)
          .map((m) => {
            const p = profileMap.get(m.user_id);
            return {
              user_id: m.user_id,
              full_name: p?.full_name ?? null,
              avatar_url: p?.avatar_url ?? null,
            };
          });

        const latestDate = latestMap.get(c.id);
        let latestActivity: string | null = null;
        if (latestDate) {
          const diff = Date.now() - new Date(latestDate).getTime();
          const hours = Math.floor(diff / 3600000);
          if (hours < 1) latestActivity = "Active just now";
          else if (hours < 24) latestActivity = `Active ${hours}h ago`;
          else latestActivity = `Active ${Math.floor(hours / 24)}d ago`;
        }

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          purpose: c.purpose,
          created_by: c.created_by,
          created_at: c.created_at,
          memberCount: members.length,
          members,
          latestActivity,
        };
      });

      setCircles(rows);
      setLoading(false);
    })();
  }, [user]);

  const filtered = searchQuery.trim()
    ? circles.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : circles;

  return (
    <div
      className="min-h-screen pb-28"
      style={{ backgroundColor: "var(--kp-bg-deep)", color: "var(--kp-text-body)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}
        >
          Prayer Circles
        </h1>
        <button
          onClick={() => navigate("/circles")}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{
            backgroundColor: "rgba(180,140,50,0.12)",
            color: "var(--kp-gold)",
          }}
        >
          <Plus className="w-5 h-5" />
        </button>
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
            placeholder="Search circles…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }}
          />
        </div>
      </div>

      {/* Circle Cards */}
      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--kp-gold)", borderTopColor: "transparent" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Users className="w-12 h-12 mx-auto" style={{ color: "var(--kp-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--kp-text-muted)" }}>
              {searchQuery ? "No circles match your search." : "You haven't joined any circles yet."}
            </p>
            <button
              onClick={() => navigate("/circles")}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.96]"
              style={{
                backgroundColor: "var(--kp-gold)",
                color: "var(--kp-bg-deep)",
              }}
            >
              Browse Circles
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((circle, i) => (
              <motion.button
                key={circle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/circles/${circle.id}`)}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--kp-bg-card)",
                  border: "1px solid var(--kp-border)",
                }}
              >
                {/* Emoji avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: "var(--kp-bg-elevated)" }}
                >
                  {CIRCLE_EMOJIS[i % CIRCLE_EMOJIS.length]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--kp-text-primary)" }}>
                    {circle.name}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--kp-text-muted)" }}>
                    {circle.latestActivity ?? (circle.description || `${circle.memberCount} members`)}
                  </p>

                  {/* Member avatars */}
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex -space-x-1.5">
                      {circle.members.slice(0, 4).map((m) => (
                        <Avatar
                          key={m.user_id}
                          className="w-5 h-5 border"
                          style={{ borderColor: "var(--kp-bg-card)" }}
                        >
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback
                            className="text-[7px] font-bold"
                            style={{ background: "var(--kp-bg-elevated)", color: "var(--kp-gold)" }}
                          >
                            {(m.full_name ?? "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {circle.memberCount > 4 && (
                      <span className="text-[10px] ml-1" style={{ color: "var(--kp-text-muted)" }}>
                        +{circle.memberCount - 4}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--kp-text-muted)" }} />
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
