import React, { useState, useRef, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import ReactMarkdown, { Components } from "react-markdown";
import {
  RefreshCw, Send, ChevronRight, Clock, Sparkles,
  Eye, Brain, Gem, Loader2, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { toast } from "sonner";

type ModelTab = "home" | "grok" | "gemini";
type ChatMsg = { role: "user" | "assistant"; content: string };

const MODEL_LABELS: Record<ModelTab, { label: string; icon: React.ReactNode; desc: string }> = {
  home: { label: "Fruit", icon: <Sparkles className="w-4 h-4" />, desc: "Gemini 3 Flash" },
  grok: { label: "Grok 4.20", icon: <Eye className="w-4 h-4" />, desc: "Reasoning" },
  gemini: { label: "Gemini 2.5 Pro", icon: <Gem className="w-4 h-4" />, desc: "Deep Analysis" },
};

export default function Fruit() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ModelTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || user.email !== "jwlesley@gmail.com") return <Navigate to="/bible" replace />;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍇</span>
          <div>
            <h1 className="text-xl font-serif font-bold tracking-tight">The Fruit Inspector</h1>
            <p className="text-xs text-muted-foreground">KeepRead.ing Product Audit Dashboard</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ModelTab)} className="flex-1">
        <div className="border-b border-border px-6">
          <TabsList className="bg-transparent h-12 gap-1">
            {(Object.keys(MODEL_LABELS) as ModelTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 px-4">
                {MODEL_LABELS[key].icon}
                <span className="hidden sm:inline">{MODEL_LABELS[key].label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {(Object.keys(MODEL_LABELS) as ModelTab[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 flex-1">
            <ReportTab model={tab} sidebarOpen={sidebarOpen} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ── WSJ-style markdown component overrides ── */
const wsjSerif = "'EB Garamond', 'Georgia', 'Times New Roman', serif";

const wsjComponents: Components = {
  h1: ({ children }) => (
    <h2
      className="text-2xl md:text-3xl font-black text-foreground mt-8 mb-3 leading-tight border-b-2 border-foreground/15 pb-2"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3
      className="text-xl md:text-2xl font-bold text-foreground mt-7 mb-2 leading-snug"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4
      className="text-base font-bold text-foreground mt-5 mb-1.5 uppercase tracking-wide text-[0.85rem]"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5
      className="text-sm font-semibold text-foreground/80 mt-4 mb-1 italic"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p
      className="text-[0.9rem] leading-[1.75] text-foreground/90 mb-3 text-justify hyphens-auto"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 ml-4 space-y-1.5 list-none">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-4 space-y-1.5 list-decimal" style={{ fontFamily: wsjSerif }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li
      className="text-[0.85rem] leading-[1.7] text-foreground/85 pl-3 relative before:content-['■'] before:absolute before:left-[-0.25rem] before:text-[0.45rem] before:text-foreground/30 before:top-[0.55em]"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="my-4 border-l-[3px] border-foreground/20 pl-4 italic text-foreground/70 text-[0.85rem] leading-relaxed"
      style={{ fontFamily: wsjSerif }}
    >
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/80">{children}</em>
  ),
  hr: () => (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-foreground/15" />
      <span className="text-[0.5rem] text-muted-foreground/40 tracking-[0.3em] uppercase">✦</span>
      <div className="h-px flex-1 bg-foreground/15" />
    </div>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="my-4 rounded-lg bg-muted/30 border border-border/50 p-4 overflow-x-auto">
          <code className="text-xs font-mono text-foreground/80">{children}</code>
        </pre>
      );
    }
    return (
      <code className="text-[0.8rem] font-mono bg-muted/30 px-1.5 py-0.5 rounded text-foreground/80">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-[0.8rem] border-collapse" style={{ fontFamily: wsjSerif }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b-2 border-foreground/20">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="text-left py-2 px-3 text-[0.7rem] font-bold uppercase tracking-wider text-foreground/60">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2 px-3 border-b border-border/30 text-foreground/80">
      {children}
    </td>
  ),
};

function ReportTab({ model, sidebarOpen }: { model: ModelTab; sidebarOpen: boolean }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const reportEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch past reports for this model
  const { data: pastReports } = useQuery({
    queryKey: ["fruit-reports", model],
    queryFn: async () => {
      const { data } = await supabase
        .from("fruit_reports")
        .select("id, model_used, created_at, chat_log, report_content")
        .eq("model_used", model)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // The currently viewed report content
  const selectedReport = pastReports?.find((r) => r.id === selectedReportId);

  // Stream a new report
  const generateReport = useCallback(async () => {
    if (!session?.access_token) return;
    setStreaming(true);
    setStreamContent("");
    setSelectedReportId(null);
    setChatMessages([]);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fruit-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ model }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Failed to generate report");
        setStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setStreamContent(full);
            }
          } catch { /* partial JSON */ }
        }
      }

      // Save report
      if (full.length > 0) {
        await supabase.from("fruit_reports").insert({
          user_id: session.user.id,
          model_used: model,
          report_content: full,
          chat_log: [],
        });
        queryClient.invalidateQueries({ queryKey: ["fruit-reports", model] });
      }
    } catch (e) {
      console.error(e);
      toast.error("Report generation failed");
    } finally {
      setStreaming(false);
    }
  }, [model, session, queryClient]);

  // Send chat message about the current report
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || !session?.access_token) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatStreaming(true);

    // Include report context in first system message
    const reportContent = selectedReport
      ? (selectedReport as any).report_content ?? streamContent
      : streamContent;

    const contextMessages: ChatMsg[] = [
      ...(reportContent ? [{ role: "user" as const, content: `Here is the current report for context:\n\n${reportContent}` }] : []),
      ...newMessages,
    ];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fruit-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ model, chat_messages: contextMessages }),
        }
      );

      if (!resp.ok) {
        toast.error("Chat response failed");
        setChatStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }

      // Update report's chat_log
      if (selectedReportId) {
        const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent }];
        await supabase
          .from("fruit_reports")
          .update({ chat_log: finalMessages as any })
          .eq("id", selectedReportId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Chat failed");
    } finally {
      setChatStreaming(false);
    }
  }, [chatInput, chatMessages, model, session, selectedReportId, streamContent, selectedReport]);

  // When selecting a past report, load its chat log
  useEffect(() => {
    if (selectedReport) {
      setChatMessages((selectedReport.chat_log as ChatMsg[]) ?? []);
      setStreamContent("");
    }
  }, [selectedReportId]);

  // Auto-scroll
  useEffect(() => {
    reportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamContent]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const displayContent = selectedReport
    ? (selectedReport as any).report_content ?? ""
    : streamContent;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar: Past Reports */}
      <div className={`border-r border-border flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0"}`}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 min-w-[16rem]">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Past Reports</span>
        </div>
        <ScrollArea className="flex-1 min-w-[16rem]">
          <div className="p-2 space-y-1">
            {pastReports?.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                  selectedReportId === report.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="font-medium truncate">
                  {MODEL_LABELS[model].label} Report
                </div>
                <div className="text-[10px] opacity-70">
                  {new Date(report.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              </button>
            ))}
            {(!pastReports || pastReports.length === 0) && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                No reports yet. Click refresh to generate one.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Report Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {MODEL_LABELS[model].icon}
            <span className="font-serif font-semibold">{MODEL_LABELS[model].label}</span>
            <span className="text-xs text-muted-foreground">— {MODEL_LABELS[model].desc}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={generateReport}
            disabled={streaming}
            className="gap-2"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {streaming ? "Generating…" : "New Report"}
          </Button>
        </div>

        {/* Report Content — WSJ front-page style */}
        <ScrollArea className="flex-1">
          {displayContent ? (
            <div className="wsj-report px-8 py-6 max-w-5xl mx-auto">
              {/* Masthead */}
              <div className="text-center border-b-[3px] border-foreground pb-3 mb-1">
                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground mb-1">
                  KeepRead.ing Product Intelligence
                </p>
                <h1
                  className="text-3xl md:text-4xl font-black tracking-tight text-foreground"
                  style={{ fontFamily: "'EB Garamond', 'Georgia', 'Times New Roman', serif" }}
                >
                  The Fruit Inspector
                </h1>
                <div className="flex items-center justify-center gap-4 mt-1.5 text-[0.6rem] text-muted-foreground">
                  <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                  <span>·</span>
                  <span>{MODEL_LABELS[model].label} — {MODEL_LABELS[model].desc}</span>
                </div>
              </div>
              {/* Thin double rule */}
              <div className="border-t border-foreground/20 mb-6" />

              {/* Article body — newspaper columns */}
              <article className="wsj-body">
                <ReactMarkdown components={wsjComponents}>{displayContent}</ReactMarkdown>
                <div ref={reportEndRef} />
              </article>

              {/* Footer rule */}
              <div className="mt-8 pt-3 border-t border-foreground/15 text-center">
                <p className="text-[0.55rem] text-muted-foreground/50 italic tracking-wider uppercase">
                  End of Report · Confidential
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 py-20">
              <span className="text-5xl">🍇</span>
              <p className="text-sm max-w-md">
                Click <strong>New Report</strong> to generate a comprehensive product audit using {MODEL_LABELS[model].desc}.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Chat Section */}
        {displayContent && (
          <div className="border-t border-border">
            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <ScrollArea className="max-h-48 px-6 py-3">
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Chat Input */}
            <div className="px-6 py-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                placeholder={`Ask ${MODEL_LABELS[model].label} about this report…`}
                disabled={chatStreaming}
                className="flex-1"
              />
              <Button size="icon" onClick={sendChat} disabled={chatStreaming || !chatInput.trim()}>
                {chatStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
