/** Shared bunch color palette — 8 distinct colors for verse bunches */
export const BUNCH_COLORS = [
  "violet",
  "teal",
  "amber",
  "rose",
  "sky",
  "lime",
  "fuchsia",
  "cyan",
] as const;

export type BunchColor = (typeof BUNCH_COLORS)[number];

/** Get a stable color for a bunch by its index in the user's bunch list */
export function getBunchColor(index: number): BunchColor {
  return BUNCH_COLORS[index % BUNCH_COLORS.length];
}

/** Tailwind classes for each bunch color */
export const BUNCH_COLOR_CLASSES: Record<
  BunchColor,
  {
    bg: string;
    bgSubtle: string;
    border: string;
    text: string;
    pill: string;
    pillText: string;
  }
> = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    bgSubtle: "bg-violet-50/40 dark:bg-violet-950/20",
    border: "border-violet-300 dark:border-violet-600",
    text: "text-violet-700 dark:text-violet-300",
    pill: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",
    pillText: "text-violet-700 dark:text-violet-300",
  },
  teal: {
    bg: "bg-teal-100 dark:bg-teal-900/40",
    bgSubtle: "bg-teal-50/40 dark:bg-teal-950/20",
    border: "border-teal-300 dark:border-teal-600",
    text: "text-teal-700 dark:text-teal-300",
    pill: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
    pillText: "text-teal-700 dark:text-teal-300",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    bgSubtle: "bg-amber-50/40 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-600",
    text: "text-amber-700 dark:text-amber-300",
    pill: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    pillText: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/40",
    bgSubtle: "bg-rose-50/40 dark:bg-rose-950/20",
    border: "border-rose-300 dark:border-rose-600",
    text: "text-rose-700 dark:text-rose-300",
    pill: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    pillText: "text-rose-700 dark:text-rose-300",
  },
  sky: {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    bgSubtle: "bg-sky-50/40 dark:bg-sky-950/20",
    border: "border-sky-300 dark:border-sky-600",
    text: "text-sky-700 dark:text-sky-300",
    pill: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800",
    pillText: "text-sky-700 dark:text-sky-300",
  },
  lime: {
    bg: "bg-lime-100 dark:bg-lime-900/40",
    bgSubtle: "bg-lime-50/40 dark:bg-lime-950/20",
    border: "border-lime-300 dark:border-lime-600",
    text: "text-lime-700 dark:text-lime-300",
    pill: "bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800",
    pillText: "text-lime-700 dark:text-lime-300",
  },
  fuchsia: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    bgSubtle: "bg-fuchsia-50/40 dark:bg-fuchsia-950/20",
    border: "border-fuchsia-300 dark:border-fuchsia-600",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    pill: "bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800",
    pillText: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    bgSubtle: "bg-cyan-50/40 dark:bg-cyan-950/20",
    border: "border-cyan-300 dark:border-cyan-600",
    text: "text-cyan-700 dark:text-cyan-300",
    pill: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800",
    pillText: "text-cyan-700 dark:text-cyan-300",
  },
};
