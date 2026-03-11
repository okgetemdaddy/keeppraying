import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Send, Sparkles, BookOpen, Heart, Loader2 } from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const suggestions = [
  "Help me write a prayer for anxiety and peace",
  "What does the Bible say about persistent prayer?",
  "Create a prayer card for morning surrender",
  "Explain the Lord's Prayer line by line",
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
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

      // Log to DB
      if (user) {
        await supabase.from("ai_chat_logs").insert({ user_id: user.id, user_message: text, ai_response: assistantText });
      }
    } catch (e: unknown) {
      toast({ title: "PrayerAssist.ing unavailable", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setLoading(false);
    }
  }, [messages, user, toast]);

  // Auto-send query from URL ?q= param (e.g. from VerseLink exegesis)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
  }, [searchParams, send]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
            <div>
            <span className="font-display font-semibold text-foreground">PrayerAssist.ing</span>
              <span className="text-xs text-muted-foreground ml-2">Your AI Prayer Companion</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-6 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">PrayerAssist.ing</h1>
                <p className="text-muted-foreground max-w-md mx-auto">Your compassionate AI prayer companion — ready to help you pray, seek Scripture, and grow in faith.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} className="prayer-card p-4 text-left text-sm text-foreground hover:border-primary/40 border border-transparent transition-all rounded-2xl group">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary"><BookOpen className="w-4 h-4" /></div>
                      <span>{s}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="verse-text text-sm">"Ask and it will be given to you…" — Matthew 7:7</p>
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
                  <div className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_strong]:text-foreground [&_em]:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
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

      {/* Input */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask for prayer guidance, Bible answers, or help writing a prayer…"
              className="flex-1 resize-none rounded-2xl min-h-[48px] max-h-32 text-sm"
              rows={1}
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()} className="h-12 w-12 p-0 rounded-xl flex-shrink-0 bg-foreground text-background hover:bg-foreground/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">AI may make mistakes. Always verify with Scripture.</p>
        </div>
      </div>
    </div>
  );
}
