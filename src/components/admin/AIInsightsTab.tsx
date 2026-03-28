import { useState, useEffect, useCallback } from "react";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Users, Heart, BookOpen, MessageSquare, Loader2, RefreshCw,
  TrendingUp, AlertTriangle, Sparkles, Bot, Shield,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import InsightsMetricCard from "./InsightsMetricCard";
import AnomalyAlert from "./AnomalyAlert";
import SuggestionPanel from "./SuggestionPanel";
import ReportViewer from "./ReportViewer";
import NLQueryBox from "./NLQueryBox";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface MonitorReport {
  id: string;
  generated_at: string;
  report_type: string;
  summary: string | null;
  suggestions: string[] | null;
  anomalies: string[] | null;
  triggered_by: string | null;
  key_metrics: Record<string, unknown> | null;
}

interface LiveStats {
  totalUsers: number;
  newUsersWeek: number;
  userGrowthPct: number | null;
  totalPrayers: number;
  approvedPrayers: number;
  pendingPrayers: number;
  totalLikes: number;
  totalPrayed: number;
  chatLogsWeek: number;
  labelData: { name: string; value: number }[];
  signupTrend: { date: string; count: number }[];
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--forest))",
  "hsl(var(--gold))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent-foreground))",
];

export default function AIInsightsTab() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<MonitorReport[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [latestSummary, setLatestSummary] = useState("");
  const [latestVerse, setLatestVerse] = useState("");
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("ai_monitor_reports")
      .select("id,generated_at,report_type,summary,suggestions,anomalies,triggered_by,key_metrics")
      .order("generated_at", { ascending: false })
      .limit(10);
    if (data) {
      setReports(data as MonitorReport[]);
      // Populate latest insights from most recent report
      const latest = data[0];
      if (latest) {
        setAnomalies((latest.anomalies as string[]) || []);
        setSuggestions((latest.suggestions as string[]) || []);
        setLatestSummary(latest.summary || "");
        const rc = latest.key_metrics as Record<string, unknown> | null;
        if (rc && typeof (rc as Record<string, unknown>).health_score === "number") {
          setHealthScore((rc as Record<string, unknown>).health_score as number);
        }
        const reportContent = (latest as unknown as { report_content: Record<string, unknown> }).report_content;
        if (reportContent && typeof reportContent.verse === "string") {
          setLatestVerse(reportContent.verse as string);
        }
      }
    }
  }, []);

  const loadLiveStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalUsers },
        { count: newUsersWeek },
        { count: newUsersPrevWeek },
        { count: totalPrayers },
        { count: approvedPrayers },
        { count: pendingPrayers },
        { count: totalLikes },
        { count: totalPrayed },
        { count: chatLogsWeek },
        { data: labelRows },
        { data: profileRows },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("prayer_cards").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("prayed_actions").select("*", { count: "exact", head: true }),
        supabase.from("ai_chat_logs").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("prayer_cards").select("labels").eq("status", "approved").not("labels", "is", null),
        supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true }),
      ]);

      // Label pie data
      const freq: Record<string, number> = {};
      (labelRows || []).forEach((r: { labels: string[] | null }) => {
        (r.labels || []).forEach((t: string) => { freq[t] = (freq[t] || 0) + 1; });
      });
      const labelData = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, value]) => ({ name, value }));

      // Signup trend (last 14 days)
      const grouped: Record<string, number> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
        grouped[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] = 0;
      }
      (profileRows || []).forEach((p: { created_at: string }) => {
        const key = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (grouped[key] !== undefined) grouped[key]++;
      });
      const signupTrend = Object.entries(grouped).map(([date, count]) => ({ date, count }));

      const userGrowthPct = newUsersPrevWeek
        ? Math.round(((((newUsersWeek || 0) - (newUsersPrevWeek || 0)) / (newUsersPrevWeek || 1)) * 100))
        : null;

      setLiveStats({
        totalUsers: totalUsers || 0,
        newUsersWeek: newUsersWeek || 0,
        userGrowthPct,
        totalPrayers: totalPrayers || 0,
        approvedPrayers: approvedPrayers || 0,
        pendingPrayers: pendingPrayers || 0,
        totalLikes: totalLikes || 0,
        totalPrayed: totalPrayed || 0,
        chatLogsWeek: chatLogsWeek || 0,
        labelData,
        signupTrend,
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadLiveStats();
  }, [loadReports, loadLiveStats]);

  const generateReport = async () => {
    if (!session) return;
    setGenerating(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-monitor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "generate", triggered_by: "manual" }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to generate report");

      const { analysis } = data;
      if (analysis) {
        setAnomalies(analysis.anomalies || []);
        setSuggestions(analysis.suggestions || []);
        setLatestSummary(analysis.summary || "");
        setHealthScore(typeof analysis.health_score === "number" ? analysis.health_score : null);
        setLatestVerse(analysis.verse || "");
      }

      toast({ title: "PrayerWatch report generated ✨" });
      loadReports();
    } catch (e) {
      toast({
        title: "Failed to generate report",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleNLQuery = async (q: string): Promise<string> => {
    if (!session) return "Not authenticated.";
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-monitor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: "query", query: q }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Query failed");
    return data.answer || "No answer available.";
  };

  const dismissAnomaly = (idx: number) => {
    setAnomalies(prev => prev.filter((_, i) => i !== idx));
  };

  const healthColor = healthScore === null ? "text-muted-foreground"
    : healthScore >= 75 ? "text-[hsl(var(--forest))]"
    : healthScore >= 50 ? "text-primary"
    : "text-destructive";

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">PrayerWatch AI</h2>
            <p className="text-xs text-muted-foreground">Automated site monitoring & insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {healthScore !== null && (
            <div className={`text-sm font-semibold ${healthColor}`}>
              <Shield className="w-4 h-4 inline mr-1" />
              Health: {healthScore}/100
            </div>
          )}
          <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={generateReport} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Report
          </Button>
        </div>
      </div>

      {/* Latest summary */}
      {latestSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="prayer-card p-4 border-l-2 border-primary/50 bg-primary/5"
        >
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Latest Analysis</p>
              <p className="text-sm text-foreground/90">{latestSummary}</p>
              {latestVerse && <p className="verse-text text-xs mt-2">{renderWithVerseLinks(latestVerse)}</p>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Live metrics */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Live Metrics</h3>
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="prayer-card p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : liveStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightsMetricCard label="Total Users" value={liveStats.totalUsers} sub={`+${liveStats.newUsersWeek} this week`} trend={liveStats.userGrowthPct} icon={Users} delay={0} />
            <InsightsMetricCard label="Approved Prayers" value={liveStats.approvedPrayers} sub={`${liveStats.pendingPrayers} pending`} icon={BookOpen} delay={0.07} />
            <InsightsMetricCard label="Total Likes" value={liveStats.totalLikes} icon={Heart} delay={0.14} />
            <InsightsMetricCard label="AI Chats (7d)" value={liveStats.chatLogsWeek} icon={MessageSquare} delay={0.21} />
          </div>
        )}
      </div>

      {/* Charts */}
      {liveStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" />User Growth (14 days)</h3>
            <div className="prayer-card p-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={liveStats.signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {liveStats.labelData.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" />Top Prayer Labels</h3>
              <div className="prayer-card p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={liveStats.labelData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {liveStats.labelData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {liveStats.labelData.map((t, i) => (
                    <span key={t.name} className="text-xs px-2 py-0.5 rounded-full border border-border" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                      {t.name} ({t.value})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Anomaly alerts */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-primary" />Anomaly Alerts
        </h3>
        <AnomalyAlert anomalies={anomalies} onDismiss={dismissAnomaly} />
      </div>

      {/* Suggestions */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />AI Suggestions
        </h3>
        <SuggestionPanel suggestions={suggestions} />
      </div>

      {/* NL Query box */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-primary" />Ask PrayerWatch
        </h3>
        <NLQueryBox onQuery={handleNLQuery} />
      </div>

      {/* Reports */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4 text-primary" />Past Reports
        </h3>
        <ReportViewer reports={reports} />
      </div>
    </div>
  );
}
