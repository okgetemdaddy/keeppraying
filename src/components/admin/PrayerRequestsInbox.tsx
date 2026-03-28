import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Check, Clock, AlertTriangle, User, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface PrayerRequest {
  id: string;
  requester_id: string;
  request_type: string;
  message: string;
  is_urgent: boolean;
  status: string;
  assigned_prayer_id: string | null;
  admin_response: string | null;
  escalation_batch: number;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export default function PrayerRequestsInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [filter, setFilter] = useState<"all" | "team" | "community">("team");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("prayer_requests" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (filter !== "all") {
      query = query.eq("request_type", filter);
    }

    const { data } = await query;
    
    if (data && data.length > 0) {
      // Fetch profiles for requester names
      const requesterIds = [...new Set((data as any[]).map((r: any) => r.requester_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", requesterIds);
      
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      
      setRequests((data as any[]).map((r: any) => ({
        ...r,
        profiles: profileMap[r.requester_id] || null,
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-prayer-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_requests" },
        () => fetchRequests()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  const fulfillTeamRequest = async (request: PrayerRequest) => {
    if (!user || !responseText.trim()) return;
    setFulfilling(true);
    try {
      // Create the prayer card
      const { data: newCard, error: cardErr } = await supabase.from("prayer_cards").insert({
        prayer_text: responseText.trim(),
        title: "A Prayer Crafted for You",
        created_by: user.id,
        source: "admin",
        status: "approved",
        labels: ["personal", "crafted"],
      }).select("id").single();
      if (cardErr) throw cardErr;

      // Update the request with the assigned prayer
      const { error: updateErr } = await supabase
        .from("prayer_requests" as any)
        .update({
          status: "fulfilled",
          assigned_prayer_id: newCard.id,
          admin_response: responseText.trim(),
        } as any)
        .eq("id", request.id);
      if (updateErr) throw updateErr;

      toast({ title: "Prayer crafted and delivered 🙏" });
      setResponseText("");
      setExpandedId(null);
      fetchRequests();
    } catch (err) {
      toast({
        title: "Failed to fulfill request",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setFulfilling(false);
    }
  };

  const statusBadge = (status: string, isUrgent: boolean) => {
    if (isUrgent) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: "hsl(0 72% 95%)", color: "hsl(0 72% 40%)" }}>
          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
        </span>
      );
    }
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: "hsl(42 80% 92%)", text: "hsl(38 75% 32%)" },
      in_progress: { bg: "hsl(210 55% 92%)", text: "hsl(210 55% 30%)" },
      fulfilled: { bg: "hsl(150 40% 90%)", text: "hsl(150 38% 26%)" },
      closed: { bg: "hsl(220 10% 90%)", text: "hsl(220 10% 40%)" },
    };
    const c = colors[status] || colors.pending;
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
        style={{ background: c.bg, color: c.text }}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold" style={{ color: "hsl(42 85% 58%)" }}>
            Prayer Requests Inbox
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "hsl(38 14% 50%)" }}>
            {requests.filter(r => r.status === "pending").length} pending request{requests.filter(r => r.status === "pending").length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: "hsl(220 26% 11%)" }}>
          {(["team", "community", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                background: filter === f ? "hsl(42 85% 46% / 0.2)" : "transparent",
                color: filter === f ? "hsl(42 85% 58%)" : "hsl(38 14% 50%)",
              }}
            >
              {f === "team" ? "Team Requests" : f === "community" ? "Community" : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(42 85% 58%)" }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "hsl(220 26% 9%)" }}>
          <p className="text-sm" style={{ color: "hsl(38 14% 50%)" }}>
            No prayer requests yet — the inbox is empty.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const isExpanded = expandedId === req.id;
            return (
              <motion.div
                key={req.id}
                layout
                className="rounded-xl overflow-hidden"
                style={{ background: "hsl(220 26% 9%)", border: "1px solid hsl(220 26% 15%)" }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "hsl(220 26% 15%)" }}
                  >
                    <User className="w-3.5 h-3.5" style={{ color: "hsl(42 85% 58%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: "hsl(38 28% 88%)" }}>
                        {req.profiles?.full_name || req.profiles?.email || "Anonymous"}
                      </span>
                      {statusBadge(req.status, req.is_urgent)}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: req.request_type === "team" ? "hsl(42 80% 92% / 0.15)" : "hsl(150 30% 90% / 0.15)",
                          color: req.request_type === "team" ? "hsl(42 85% 58%)" : "hsl(150 38% 56%)",
                        }}>
                        {req.request_type === "team" ? "Team Request" : "Community"}
                      </span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "hsl(38 14% 65%)" }}>
                      {req.message}
                    </p>
                    <p className="text-[10px] mt-1.5" style={{ color: "hsl(38 14% 40%)" }}>
                      {format(new Date(req.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "hsl(38 14% 40%)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "hsl(38 14% 40%)" }} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid hsl(220 26% 15%)" }}>
                        {/* Full message */}
                        <div className="pt-3">
                          <p className="text-xs font-medium mb-1" style={{ color: "hsl(42 85% 58%)" }}>Full Request</p>
                          <p className="text-sm leading-relaxed" style={{ color: "hsl(38 28% 82%)" }}>
                            {req.message}
                          </p>
                        </div>

                        {/* Admin response area for team requests */}
                        {req.request_type === "team" && req.status === "pending" && (
                          <div className="space-y-3">
                            {/* Step A: AI Prompt */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium" style={{ color: "hsl(42 85% 58%)" }}>
                                Generate with AI
                              </p>
                              <Textarea
                                value={aiPrompt || `Write a powerful Christian prayer ${req.message}`}
                                onChange={e => setAiPrompt(e.target.value)}
                                placeholder="Write a powerful Christian prayer..."
                                className="min-h-[80px] rounded-xl text-sm resize-none"
                                style={{
                                  background: "hsl(220 26% 7%)",
                                  borderColor: "hsl(220 26% 18%)",
                                  color: "hsl(38 28% 88%)",
                                }}
                              />
                              <Button
                                onClick={async () => {
                                  setGenerating(true);
                                  try {
                                    const prompt = aiPrompt || `Write a powerful Christian prayer ${req.message}`;
                                    const { data, error } = await supabase.functions.invoke("craft-prayer", {
                                      body: { prompt },
                                    });
                                    if (error) throw error;
                                    if (data?.prayer) {
                                      setResponseText(data.prayer);
                                    }
                                  } catch (err) {
                                    toast({
                                      title: "AI generation failed",
                                      description: err instanceof Error ? err.message : "Try again",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setGenerating(false);
                                  }
                                }}
                                disabled={generating}
                                className="rounded-xl h-8 text-xs gap-1.5"
                                style={{
                                  background: generating ? "hsl(220 26% 15%)" : "hsl(220 26% 15%)",
                                  color: "hsl(42 85% 58%)",
                                  border: "1px solid hsl(42 85% 46% / 0.3)",
                                }}
                              >
                                {generating ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Grok is writing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate Prayer
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Step B: Review & Edit */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium" style={{ color: "hsl(42 85% 58%)" }}>
                                Review & Edit Prayer
                              </p>
                              <Textarea
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                placeholder="Heavenly Father, we lift up this beloved child..."
                                className="min-h-[140px] rounded-xl text-sm resize-none"
                                style={{
                                  background: "hsl(220 26% 7%)",
                                  borderColor: "hsl(220 26% 18%)",
                                  color: "hsl(38 28% 88%)",
                                }}
                              />
                              <Button
                                onClick={() => fulfillTeamRequest(req)}
                                disabled={fulfilling || !responseText.trim()}
                                className="rounded-xl h-9 text-xs gap-1.5"
                                style={{ background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))", color: "white" }}
                              >
                                {fulfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Deliver to User's Board
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Show fulfilled response */}
                        {req.status === "fulfilled" && req.admin_response && (
                          <div className="rounded-xl p-3" style={{ background: "hsl(150 30% 12%)", border: "1px solid hsl(150 28% 22%)" }}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Check className="w-3.5 h-3.5" style={{ color: "hsl(150 50% 50%)" }} />
                              <p className="text-xs font-medium" style={{ color: "hsl(150 50% 60%)" }}>
                                Prayer Delivered
                              </p>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "hsl(150 20% 75%)" }}>
                              {req.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
