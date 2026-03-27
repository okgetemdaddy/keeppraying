import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface NLQueryBoxProps {
  onQuery: (q: string) => Promise<string>;
}

export default function NLQueryBox({ onQuery }: NLQueryBoxProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");

  const presets = [
    "What's causing low user retention?",
    "Which prayer labels are trending?",
    "Are there any spam patterns in uploads?",
    "What features would boost engagement?",
  ];

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await onQuery(q);
      setAnswer(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => { setInput(p); ask(p); }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder="Ask PrayerWatch anything about your site…"
          className="flex-1 resize-none rounded-xl text-sm min-h-[48px] max-h-32"
          rows={1}
        />
        <Button
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          className="h-12 w-12 p-0 rounded-xl flex-shrink-0 bg-foreground text-background hover:bg-foreground/90"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {(loading || answer) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="prayer-card p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">PrayerWatch</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing site data…
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground [&_p]:mb-2 [&_strong]:text-foreground">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
