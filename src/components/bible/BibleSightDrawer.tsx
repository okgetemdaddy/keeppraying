import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, BookOpen, Send, Loader2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { useAuth } from "@/contexts/AuthContext";
import { USFM_BOOK_NAMES } from "@/lib/usfmBooks";
import ReactMarkdown from "react-markdown";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface BibleSightDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookUsfm: string;
  chapterNumber: number;
  onTriggerDeepStudy?: () => void;
  initialContext?: { author: string; excerpt: string } | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function BibleSightDrawer({
  open,
  onOpenChange,
  bookUsfm,
  chapterNumber,
  onTriggerDeepStudy,
  initialContext,
}: BibleSightDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bookName = USFM_BOOK_NAMES[bookUsfm] ?? bookUsfm;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Handle initialContext from Commentary "Go Deeper" handoff
  useEffect(() => {
    if (open && initialContext && messages.length === 0) {
      const greeting: ChatMessage = {
        role: "assistant",
        content: `Praise God you want to go deeper! 🙏 I see you were reading **${initialContext.author}**'s commentary on **${bookName} ${chapterNumber}**.\n\nIs there anything in particular you'd like to explore — or would you like to see what Bible Sight can see?`,
      };
      setMessages([greeting]);
    }
  }, [open, initialContext]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !user) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const { data: sessionData } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/bible-sight-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          book_usfm: bookUsfm,
          chapter_number: chapterNumber,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect to Bible Sight");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Strip [GENERATE_STUDY] marker from display and save chat log
      if (assistantContent.includes("[GENERATE_STUDY]")) {
        const cleanContent = assistantContent.replace(/\[GENERATE_STUDY\]/g, "").trim();
        const finalMessages = newMessages.concat([{ role: "assistant" as const, content: cleanContent }]);
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.role === "assistant"
              ? { ...m, content: cleanContent }
              : m
          )
        );

        // Save chat log to bible_sight_entries for private access later
        try {
          const { supabase: sb } = await import("@/integrations/supabase/client");
          await sb.from("bible_sight_entries").insert({
            user_id: user.id,
            book_usfm: bookUsfm,
            chapter_number: chapterNumber,
            content: cleanContent,
            entry_type: "study_session",
            lens_used: "bible_sight_chat",
            model_used: "grok-4-0709",
            chat_log: finalMessages,
            title: `Bible Sight — ${bookName} ${chapterNumber}`,
          });
        } catch (e) {
          console.error("Failed to save chat log:", e);
        }
      }
    } catch (e) {
      console.error("Bible Sight error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I wasn't able to connect just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, user, bookUsfm, chapterNumber, onTriggerDeepStudy, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] max-h-[80vh] bg-background dark:bg-[#1C1C1E] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Bible Sight</h2>
            <span className="text-[0.6rem] text-muted-foreground">
              {bookName} {chapterNumber}
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {messages.length === 0 ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-80">
              <BookOpen className="h-10 w-10 text-amber-500/60" />
              <div className="max-w-xs space-y-2">
                <p
                  className="text-base text-foreground font-medium"
                  style={{ fontFamily: "'EB Garamond', serif" }}
                >
                  Welcome to Bible Sight
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I can help you narrow down a topic and when you're ready, I'll generate a study session you can explore.
                </p>
                <p className="text-[0.6rem] text-muted-foreground/60 italic pt-2">
                  Currently reading {bookName} {chapterNumber}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/50 dark:bg-[#2C2C2E] text-foreground rounded-bl-md border border-border/30"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => {
                            const text = typeof children === "string" ? children : "";
                            if (text && typeof text === "string") {
                              return <p>{renderWithVerseLinks(text)}</p>;
                            }
                            return <p>{children}</p>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted/50 dark:bg-[#2C2C2E] rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span className="italic">Reflecting on the Word...</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Input area */}
        <div className="border-t border-border/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!user ? (
            <p className="text-sm text-muted-foreground text-center italic">
              Sign in to use Bible Sight
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like to go deeper into?"
                disabled={isLoading}
                className="flex-1 rounded-xl bg-muted/30 dark:bg-[#2C2C2E] border-border/50"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
