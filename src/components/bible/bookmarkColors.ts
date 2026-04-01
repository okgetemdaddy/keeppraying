/* ── Bookmark Color Palette ──
   3 default colors always visible + expansion colors assigned via "+" button.
*/

export interface BookmarkColorDef {
  key: string;
  label: string;
  /** Tailwind class for the filled dot / swatch */
  dot: string;
  /** Tailwind class for the BookmarkCheck icon tint */
  icon: string;
  /** Ring accent on hover / active */
  ring: string;
}

export const DEFAULT_BOOKMARK_COLORS: BookmarkColorDef[] = [
  { key: "gold",  label: "Gold",  dot: "bg-amber-400",   icon: "text-amber-500",   ring: "ring-amber-500" },
  { key: "coral", label: "Coral", dot: "bg-rose-400",    icon: "text-rose-500",    ring: "ring-rose-500" },
  { key: "sky",   label: "Sky",   dot: "bg-sky-400",     icon: "text-sky-500",     ring: "ring-sky-500" },
];

export const EXPANSION_BOOKMARK_COLORS: BookmarkColorDef[] = [
  { key: "emerald", label: "Emerald", dot: "bg-emerald-400", icon: "text-emerald-500", ring: "ring-emerald-500" },
  { key: "violet",  label: "Violet",  dot: "bg-violet-400",  icon: "text-violet-500",  ring: "ring-violet-500" },
  { key: "rose",    label: "Rose",    dot: "bg-pink-400",     icon: "text-pink-500",    ring: "ring-pink-500" },
  { key: "teal",    label: "Teal",    dot: "bg-teal-400",     icon: "text-teal-500",    ring: "ring-teal-500" },
  { key: "orange",  label: "Orange",  dot: "bg-orange-400",   icon: "text-orange-500",  ring: "ring-orange-500" },
];

export const ALL_BOOKMARK_COLORS: BookmarkColorDef[] = [
  ...DEFAULT_BOOKMARK_COLORS,
  ...EXPANSION_BOOKMARK_COLORS,
];

/** Look up a color def by key (fallback to gold). */
export function getBookmarkColorDef(key: string): BookmarkColorDef {
  return ALL_BOOKMARK_COLORS.find((c) => c.key === key) ?? DEFAULT_BOOKMARK_COLORS[0];
}

/**
 * Given the set of colors already used by the user's bookmarks,
 * return the next expansion color to auto-assign.
 */
export function getNextExpansionColor(usedColors: Set<string>): BookmarkColorDef {
  for (const c of EXPANSION_BOOKMARK_COLORS) {
    if (!usedColors.has(c.key)) return c;
  }
  // All used — cycle back
  return EXPANSION_BOOKMARK_COLORS[usedColors.size % EXPANSION_BOOKMARK_COLORS.length];
}
