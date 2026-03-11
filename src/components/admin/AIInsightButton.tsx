import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface AIInsightButtonProps {
  data: Record<string, unknown>;
  context: string;           // e.g. "user profile", "contact submission", "prayer card"
  accessToken: string;
  className?: string;
  size?: "sm" | "md";
}

export default function AIInsightButton({
  data,
  context,
  accessToken,
  className = "",
  size = "md",
}: AIInsightButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const generate = async () => {
    if (summary) { setOpen(true); return; }
    setLoading(true);
    setOpen(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-monitor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "summarize",
          context,
          data,
        }),
      });
      const result = await resp.json();
      setSummary(result.summary || "No summary available.");
    } catch {
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  const btnSize = size === "sm"
    ? "w-6 h-6 text-[10px]"
    : "w-8 h-8 text-xs";

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={generate}
        title="AI Summary"
        className={`${btnSize} rounded-full bg-gradient-gold text-white flex items-center justify-center shadow-gold hover:opacity-90 transition-opacity flex-shrink-0`}
      >
        {loading ? (
          <Loader2 className={size === "sm" ? "w-3 h-3 animate-spin" : "w-3.5 h-3.5 animate-spin"} />
        ) : (
          <Sparkles className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-72 prayer-card p-3.5 shadow-xl border border-border/60"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold text-primary capitalize">AI Summary · {context}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Generating insight…</span>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground/80 [&_p]:text-xs [&_p]:mb-1.5 [&_li]:text-xs [&_strong]:text-foreground">
                <ReactMarkdown>{summary || ""}</ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
