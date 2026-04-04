import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, BookOpen, Heart, Loader2, LogIn, Mic, MicOff, Save, AudioLines, Flame, Users } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { SiteNav } from "@/components/SiteNav";
import PrayerCardLink from "@/components/PrayerCardLink";
import PrayerDraftCard from "@/components/PrayerDraftCard";

interface Message { role: "user" | "assistant" | "signup-nudge"; content: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const GUEST_STORAGE_KEY = "kp_guest_assist_count";

// Regex patterns
const PRAYER_DRAFT_PATTERN = /\[PRAYER_DRAFT\]([\s\S]*?)\[\/PRAYER_DRAFT\]/g;

function renderAIContent(content: string) {
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  // First pass: split by prayer drafts
  const draftPattern = /\[PRAYER_DRAFT\]([\s\S]*?)\[\/PRAYER_DRAFT\]/g;
  let draftMatch;
  const parts: { type: "text" | "draft"; content: string }[] = [];
  let draftCursor = 0;

  while ((draftMatch = draftPattern.exec(content)) !== null) {
    if (draftMatch.index > draftCursor) {
      parts.push({ type: "text", content: content.slice(draftCursor, draftMatch.index) });
    }
    parts.push({ type: "draft", content: draftMatch[1] });
    draftCursor = draftMatch.index + draftMatch[0].length;
  }
  if (draftCursor < content.length) {
    parts.push({ type: "text", content: content.slice(draftCursor) });
  }

  for (const part of parts) {
    if (part.type === "draft") {
      segments.push(<PrayerDraftCard key={key++} initialText={part.content} />);
      continue;
    }

    // Second pass on text: verse links and prayer card links
    const combined = new RegExp(
      `(\\[\\[([1-3]?\\s?[A-Z][a-zA-Z]+\\.?\\s\\d+:\\d+(?:-\\d+)?)\\]\\])|` +
      `(\\[Prayer Card:\\s*([^\\]]+)\\]\\(prayer-card:([a-f0-9-]{36})\\))`,
      "g"
    );

    let match;
    let innerCursor = 0;
    const text = part.content;

    while ((match = combined.exec(text)) !== null) {
      if (match.index > innerCursor) {
        const before = text.slice(innerCursor, match.index);
        segments.push(
          <span key={key++}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <>{children}</> }}>
              {before}
            </ReactMarkdown>
          </span>
        );
      }

      if (match[1]) {
        segments.push(<VerseLink key={key++} reference={match[2]} />);
      } else if (match[3]) {
        segments.push(<PrayerCardLink key={key++} id={match[5]} title={match[4].trim()} />);
      }
      innerCursor = match.index + match[0].length;
    }

    if (innerCursor < text.length) {
      segments.push(
        <span key={key++}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <>{children}</> }}>
            {text.slice(innerCursor)}
          </ReactMarkdown>
        </span>
      );
    }
  }

  return <>{segments}</>;
}

const suggestions = [
  "How do I pray about anxiety and find peace?",
  "What does the Bible say about persistent prayer?",
  "Help me understand the Lord's Prayer",
  "I need help praying for a friend",
  "Help me pray for my family",
  "Explain how to pray for someone else (intercession)",
];

export default function PrayerAssist() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const autoSentRef = useRef(false);
  const [guestLimited, setGuestLimited] = useState(false);

  // Check guest limit on mount
  useEffect(() => {
    if (!user) {
      const count = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) || "0", 10);
      if (count >= 1) setGuestLimited(true);
    }
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    // Guest limit check — show graceful message instead of silent failure
    if (!user && guestLimited) {
      toast({ title: "Continue your journey ✦", description: "Sign up free to keep exploring Scripture together." });
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantText = "";
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/prayer-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const chunk = JSON.parse(json).choices?.[0]?.delta?.content;
            if (chunk) {
              assistantText += chunk;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }

      // Track guest usage — set limited state before clearing loading
      if (!user) {
        const count = parseInt(localStorage.getItem(GUEST_STORAGE_KEY) || "0", 10) + 1;
        localStorage.setItem(GUEST_STORAGE_KEY, String(count));
        if (count >= 1) {
          setGuestLimited(true);
        }
      }

      if (user) {
        await supabase.from("ai_chat_logs").insert({ user_id: user.id, user_message: text, ai_response: assistantText });
      }
    } catch (e: unknown) {
      toast({ title: "PrayerAssist unavailable", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setLoading(false);
    }
  }, [messages, user, toast, guestLimited]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
  }, [searchParams, send]);

  const showGuestBanner = !user && guestLimited;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-6 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">PrayerAssist.ing</h1>
              <p className="text-muted-foreground max-w-md mx-auto">Your compassionate PrayerAssist-powered prayer companion — ready to help you pray, craft prayers, seek Scripture, and grow in faith.</p>
              <Link to="/support#ai-stance" className="inline-block text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
                Our Heart Behind the Tools
              </Link>
              </div>

              {/* Beta notice */}
              <div
                className="rounded-2xl px-5 py-4 text-center text-sm leading-relaxed max-w-xl mx-auto"
                style={{
                  background: "hsl(42 65% 97%)",
                  border: "1px solid hsl(42 55% 85%)",
                  color: "hsl(38 50% 38%)",
                }}
              >
                <span className="font-semibold">KeepPray.ing is currently in Beta ❤️</span>
                {" "}Bugs or suggestions? Please use the{" "}
                <Link to="/support#contact" className="underline font-medium hover:text-primary transition-colors">
                  contact form
                </Link>.
                {" "}A beautiful iOS app is coming soon!
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} disabled={showGuestBanner} className="prayer-card p-4 text-left text-sm text-foreground hover:border-primary/40 border border-transparent transition-all rounded-2xl group disabled:opacity-50">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary"><BookOpen className="w-4 h-4" /></div>
                      <span>{s}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="verse-text text-sm">"Ask and it will be given to you…" — <VerseLink reference="Matthew 7:7" /></p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 animate-fade-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-gold flex-shrink-0 flex items-center justify-center shadow-gold mt-1">
                  <Heart className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "prayer-card rounded-bl-md"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_strong]:text-foreground [&_em]:text-muted-foreground [&_p]:leading-relaxed">
                    {renderAIContent(msg.content)}
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-gold flex-shrink-0 flex items-center justify-center shadow-gold">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="prayer-card rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input or Guest Banner — offset above mobile tab bar + safe area */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          {showGuestBanner ? (
            <div className="text-center space-y-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed max-w-md mx-auto">
                We loved exploring that passage with you. ✦ Create a free account to continue your journey — save prayers, dive deeper into Scripture, and let PrayerAssist walk with you every day.
              </p>
              <p className="verse-text text-xs italic text-muted-foreground">
                "For where two or three gather in my name, there am I with them." — <VerseLink reference="Matthew 18:20" />
              </p>
              <Button asChild className="rounded-xl bg-gradient-gold text-white hover:opacity-90 shadow-gold">
                <Link to="/auth">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign Up Free
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-3 items-end">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Ask for prayer guidance, Bible answers, or help crafting a prayer…"
                  className="flex-1 resize-none rounded-2xl min-h-[48px] max-h-32 text-sm"
                  rows={1}
                />
                <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="h-12 w-12 p-0 rounded-xl flex-shrink-0 bg-foreground text-background hover:bg-foreground/90">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">PrayerAssist guides your prayer journey. Always verify with Scripture.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
