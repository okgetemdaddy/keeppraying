

## Prayer Viewer Modal — Complete Rebuild

### Summary
Rebuild `PrayerViewerModal.tsx` as a cinematic "theater mode" reading experience with animated glowing borders. Remove all underlines from card links. Fix "Show scripture" → "Scripture" with capital S. Update `BoardCard.tsx` to add "See less…" exit trigger and remove underlines.

### File 1: `src/components/board/PrayerViewerModal.tsx` — Full rewrite

**Backdrop**: `fixed inset-0 z-50 bg-black/80 backdrop-blur-md` — much darker, true theater dimming.

**Theater container**: Centered reading pane with animated glowing border:
- Outer wrapper with CSS `@keyframes` glow animation using the app's warm palette (gold `hsl(42 85% 46%)`, cream `hsl(38 60% 97%)`, forest `hsl(150 38% 26%)`)
- Glow border via `box-shadow` cycling through warm gold → soft amber → forest green with `animation: theater-glow 6s ease-in-out infinite`
- Container: `bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl overflow-y-auto flex flex-col relative`
- On mobile: full screen. On desktop: floating centered card with the animated glow border.

**Close button (X)**: Large, prominent — `absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-20 bg-white shadow-md`

**Content area** (`p-8 md:p-12`):
- Title: `text-xl md:text-2xl font-display font-semibold text-slate-900 mb-6`
- Prayer text: `text-base md:text-lg text-slate-800 leading-[1.85] font-body selection:bg-amber-100 selection:text-slate-900` — optimized for legibility and text selection
- Custom font support preserved
- Scripture, labels, notes sections below with clean spacing
- "See less…" button at bottom of prayer text: `text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mt-4` — NO underline — closes the modal

**Sticky action footer**: `sticky bottom-0 bg-white border-t border-slate-100 p-4 flex items-center justify-between mt-auto` with all action buttons (Favorite, Pin, Share, Playlist, Testify, Visibility toggle).

**Animation**: The glow border keyframes will be defined as an inline `<style>` tag or via Tailwind arbitrary values. The glow cycles:
```
0%   box-shadow: 0 0 20px 4px hsla(42,85%,46%,0.3), 0 0 60px 8px hsla(42,85%,46%,0.1)
33%  box-shadow: 0 0 20px 4px hsla(35,68%,85%,0.4), 0 0 60px 8px hsla(150,38%,26%,0.1)
66%  box-shadow: 0 0 20px 4px hsla(150,38%,26%,0.25), 0 0 60px 8px hsla(42,85%,46%,0.1)
100% box-shadow: 0 0 20px 4px hsla(42,85%,46%,0.3), 0 0 60px 8px hsla(42,85%,46%,0.1)
```

### File 2: `src/components/board/BoardCard.tsx` — Targeted edits

1. **Remove all underlines** from "See more…", Scripture toggle, and Labels toggle buttons:
   - Change from `underline decoration-amber-400 decoration-2 underline-offset-4 md:hover:decoration-amber-500` → `no-underline hover:text-amber-600`
   
2. **Fix "Show scripture"** → When closed show "Scripture", when open show "Hide Scripture" (capital S, remove "Show")

3. Keep the `viewerOpen` state and `PrayerViewerModal` render as-is — just passing the updated modal.

### File 3: `src/components/board/PrayerViewerModal.tsx` — Remove underlines from comment toggle too
- Comment toggle button: remove underline classes, use clean `text-slate-500 hover:text-slate-700 font-semibold` instead.

### Technical Notes
- The glowing border animation uses a `style` element injected via React for the `@keyframes` — no tailwind config changes needed
- Body scroll lock and Escape key handling preserved
- framer-motion `AnimatePresence` preserved for enter/exit
- All existing actions (favorite, pin, share, testify, visibility, notes, comments, playlist) remain in the modal footer and body

