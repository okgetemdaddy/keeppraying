/**
 * Verse of the Day widget — dark-themed for the Prayer Station hero.
 * Uses the headless YouVersion hook with graceful fallback.
 */
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import VerseLink from "@/components/VerseLink";
import { useVerseOfTheDay } from "@/hooks/use-youversion";
import { isYouVersionConfigured } from "@/lib/youversion/client";

interface VerseOfTheDayProps {
  /** Light mode for non-dark surfaces (e.g. Profile page) */
  light?: boolean;
}

export function VerseOfTheDay({ light = false }: VerseOfTheDayProps) {
  const { data, loading } = useVerseOfTheDay();

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        <Skeleton className={`h-3 w-32 ${light ? "" : "bg-white/10"}`} />
        <Skeleton className={`h-4 w-full max-w-md ${light ? "" : "bg-white/10"}`} />
        <Skeleton className={`h-4 w-3/4 max-w-sm ${light ? "" : "bg-white/10"}`} />
      </div>
    );
  }

  if (!data) return null;

  // Strip HTML tags for clean display, but keep the raw HTML for rich rendering
  const plainText = data.html.replace(/<[^>]+>/g, "").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mt-3"
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <BookOpen
          className="w-3.5 h-3.5"
          style={{ color: light ? "hsl(var(--primary))" : "rgba(255,215,100,0.7)" }}
        />
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: light ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.40)" }}
        >
          Verse of the Day
        </span>
      </div>

      {/* Verse text */}
      <p
        className="font-display text-sm leading-relaxed italic"
        style={{
          color: light ? "hsl(var(--foreground))" : "rgba(255,255,255,0.75)",
          maxWidth: 520,
        }}
      >
        "{plainText}"
      </p>

      {/* Reference + VerseLink */}
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: light ? "hsl(var(--primary))" : "rgba(255,215,100,0.75)" }}
        >
          — {data.reference}
        </span>
        <VerseLink reference={data.reference} />
      </div>

      {/* Copyright & Attribution */}
      {(data.copyright || isYouVersionConfigured()) && (
        <p
          className="text-[10px] mt-1"
          style={{ color: light ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.25)" }}
        >
          {data.copyright && <span>{data.copyright} · </span>}
          {isYouVersionConfigured() && (
            <a
              href="https://www.youversion.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "inherit" }}
            >
              Powered by YouVersion
            </a>
          )}
        </p>
      )}
    </motion.div>
  );
}
