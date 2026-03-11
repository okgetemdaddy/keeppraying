import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestionPanelProps {
  suggestions: string[];
  onImplement?: (suggestion: string) => void;
}

export default function SuggestionPanel({ suggestions, onImplement }: SuggestionPanelProps) {
  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">Generate a report to see AI-powered suggestions.</p>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.07 }}
          className="prayer-card p-4 flex items-start gap-3 group"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm text-foreground flex-1 leading-relaxed">{s}</p>
          {onImplement && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 gap-1 text-xs"
              onClick={() => onImplement(s)}
            >
              Use <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
