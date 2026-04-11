/**
 * prayerCardTheme.ts — Single source of truth for the KeepPray.ing prayer card visual system.
 *
 * Both PrayerCardAsset (design lab) and BoardCard (production) import from here.
 * Never duplicate these constants.
 */

/* ─── CardTheme type ─────────────────────────────────────────────────────── */
export type CardTheme = {
  mode: "light" | "dark";
  name: string;
  cardBg: string;
  textColor: string;
  titleColor: string;
  headingColor: string;
  brandColor: string;
  borderGlow: string;
  borderSolid: string;
  barBg: string;
  barBorder: string;
  iconDefault: string;
  iconActive: string;
  drawerBg: string;
  drawerText: string;
  drawerMuted: string;
  drawerCardBg: string;
  drawerBorder: string;
  drawerHandle: string;
  drawerInputBg: string;
  drawerBtnPrimary: string;
  drawerBtnSecondary: string;
  dustColor: string;
  innerGlow: string;
  lampLight: string;
};

/* ─── Background presets per mode ────────────────────────────────────────── */
export const DARK_BACKGROUNDS = [
  { name: "Deep Brown", bg: "linear-gradient(175deg, #2a2318 0%, #1a1610 40%, #15120d 100%)" },
  { name: "Charcoal", bg: "linear-gradient(175deg, #252528 0%, #1a1a1e 40%, #131315 100%)" },
  { name: "Navy", bg: "linear-gradient(175deg, #1e2230 0%, #151820 40%, #0e1118 100%)" },
];

export const LIGHT_BACKGROUNDS = [
  { name: "Ivory", bg: "linear-gradient(175deg, #faf6f0 0%, #f5f0e6 40%, #ede7db 100%)" },
  { name: "Pure White", bg: "linear-gradient(175deg, #ffffff 0%, #fafafa 40%, #f5f5f5 100%)" },
  { name: "Warm Beige", bg: "linear-gradient(175deg, #f0ebe0 0%, #e8e0d2 40%, #ddd5c5 100%)" },
];

/* ─── Theme constants (without cardBg — that's set per-card) ─────────────── */
export const THEME_DARK: Omit<CardTheme, "cardBg"> = {
  mode: "dark",
  name: "Provision",
  textColor: "#c8b898",
  titleColor: "#c9a84c",
  headingColor: "#f0e8d8",
  brandColor: "#c9a84c",
  borderGlow:
    "0 0 40px 4px rgba(180,140,50,0.18), 0 0 80px 8px rgba(160,120,40,0.10), 0 0 120px 16px rgba(140,100,30,0.05)",
  borderSolid: "1px solid rgba(180,140,50,0.25)",
  barBg: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.6))",
  barBorder: "1px solid rgba(180,140,50,0.08)",
  iconDefault: "#6b5f4d",
  iconActive: "#c9a84c",
  drawerBg: "#1a1610",
  drawerText: "#c8b898",
  drawerMuted: "#6b5f4d",
  drawerCardBg: "#221e16",
  drawerBorder: "rgba(180,140,50,0.12)",
  drawerHandle: "rgba(180,140,50,0.25)",
  drawerInputBg: "#2a2318",
  drawerBtnPrimary: "#c9a84c",
  drawerBtnSecondary: "#2a2318",
  dustColor: "rgba(210,185,120,",
  innerGlow:
    "inset 0 0 40px 8px rgba(180,140,50,0.04), inset 0 0 80px 16px rgba(160,120,40,0.03)",
  lampLight:
    "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(220,190,120,0.12) 0%, rgba(200,170,100,0.04) 50%, transparent 100%)",
};

export const THEME_LIGHT: Omit<CardTheme, "cardBg"> = {
  mode: "light",
  name: "Grace",
  textColor: "#4a4035",
  titleColor: "#b8942f",
  headingColor: "#2c2419",
  brandColor: "#b8942f",
  borderGlow:
    "0 0 30px 4px rgba(200,170,80,0.08), 0 0 60px 8px rgba(180,150,60,0.05)",
  borderSolid: "1px solid rgba(180,150,60,0.18)",
  barBg: "linear-gradient(to top, rgba(250,245,235,0.98), rgba(245,240,230,0.8))",
  barBorder: "1px solid rgba(180,150,60,0.10)",
  iconDefault: "#9a8d7a",
  iconActive: "#b8942f",
  drawerBg: "#faf6f0",
  drawerText: "#4a4035",
  drawerMuted: "#9a8d7a",
  drawerCardBg: "#f0ebe0",
  drawerBorder: "rgba(180,150,60,0.12)",
  drawerHandle: "rgba(180,150,60,0.3)",
  drawerInputBg: "#f5f0e6",
  drawerBtnPrimary: "#b8942f",
  drawerBtnSecondary: "#f0ebe0",
  dustColor: "rgba(180,150,60,",
  innerGlow:
    "inset 0 0 40px 8px rgba(200,170,80,0.03), inset 0 0 80px 16px rgba(180,150,60,0.02)",
  lampLight:
    "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(200,170,80,0.06) 0%, rgba(180,150,60,0.02) 50%, transparent 100%)",
};

/* ─── Google Fonts ───────────────────────────────────────────────────────── */
export const GOOGLE_FONTS = [
  // Serif
  { name: "Cormorant Garamond", category: "Devotional", type: "serif" },
  { name: "Playfair Display", category: "Classic", type: "serif" },
  { name: "Lora", category: "Elegant", type: "serif" },
  { name: "EB Garamond", category: "Timeless", type: "serif" },
  { name: "Crimson Pro", category: "Modern Serif", type: "serif" },
  { name: "Libre Baskerville", category: "Traditional", type: "serif" },
  // Sans-Serif
  { name: "Inter", category: "Modern", type: "sans-serif" },
  { name: "Nunito", category: "Friendly", type: "sans-serif" },
  { name: "Open Sans", category: "Universal", type: "sans-serif" },
  { name: "Raleway", category: "Refined", type: "sans-serif" },
  { name: "Outfit", category: "Contemporary", type: "sans-serif" },
  { name: "DM Sans", category: "Clean", type: "sans-serif" },
] as const;

export function loadGoogleFont(fontName: string) {
  const id = `gfont-${fontName.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/* ─── SVG Icons ──────────────────────────────────────────────────────────── */

export function PrayingHandsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C12 2 9 5.5 9 9v4l-2 3v3h10v-3l-2-3V9c0-3.5-3-7-3-7z" />
      <path d="M9 13H7.5a1.5 1.5 0 0 0 0 3H9" />
      <path d="M15 13h1.5a1.5 1.5 0 0 1 0 3H15" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

export function PraiseHandsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 11V4a1 1 0 0 1 2 0v3" />
      <path d="M5 13V6a1 1 0 0 1 2 0v5" />
      <path d="M9 12V6a1 1 0 0 1 2 0v6" />
      <path d="M15 11V4a1 1 0 0 0-2 0v3" />
      <path d="M19 13V6a1 1 0 0 0-2 0v5" />
      <path d="M13 12V6a1 1 0 0 0-2 0v6" />
      <path d="M5 13a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4" />
      <path d="M9 17v3" />
      <path d="M15 17v3" />
    </svg>
  );
}

/* ─── Luminance helper for board theme bridge ────────────────────────────── */
/**
 * Returns true if a CSS colour string is "dark" (luminance < 0.4).
 * Supports hex (#xxx, #xxxxxx), rgb(r,g,b), hsl(h,s%,l%), and named colours.
 */
export function isLuminanceDark(color: string | undefined): boolean {
  if (!color) return false;
  try {
    // Try hsl first — most board themes use hsl strings
    const hslMatch = color.match(
      /hsl[a]?\(\s*[\d.]+[\s,/]+[\d.]+%?\s*[\s,/]+([\d.]+)%/i
    );
    if (hslMatch) {
      const lightness = parseFloat(hslMatch[1]);
      return lightness < 50;
    }
    // Try hex
    let hex = color.replace("#", "");
    if (hex.length === 3)
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 0.4;
    }
    // Try rgb(r,g,b)
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]) / 255;
      const g = parseInt(rgbMatch[2]) / 255;
      const b = parseInt(rgbMatch[3]) / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 0.4;
    }
  } catch {
    // fall through
  }
  return false;
}

/**
 * Build a resolved CardTheme from the board's themeVars.
 * Cards inherit the board theme by default — no per-card override unless explicitly set.
 */
export function buildCardTheme(
  themeVars?: Record<string, string>,
  cardBgOverride?: string
): CardTheme {
  const isDark = isLuminanceDark(themeVars?.["--board-text"]);
  const base = isDark ? THEME_DARK : THEME_LIGHT;
  const backgrounds = isDark ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;

  return {
    ...base,
    brandColor: themeVars?.["--board-accent"] || base.brandColor,
    cardBg: cardBgOverride || backgrounds[0].bg,
  } as CardTheme;
}

/* ─── CSS keyframe style tag content ─────────────────────────────────────── */
export const PRAYER_CARD_STYLES = `
@keyframes pca-glow-pulse {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}
@keyframes pca-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.004); }
}
.pca-hide-scrollbar { overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none; }
.pca-hide-scrollbar::-webkit-scrollbar { display: none; }
`;
