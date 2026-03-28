

## Prayer Viewer Modal — Implementation Plan

### What We're Building
A full-screen (mobile) / centered floating card (desktop) modal that opens when a user clicks "See more" or the card body. It replaces the current inline expansion with a focused reading experience.

### Architecture

**New file: `src/components/board/PrayerViewerModal.tsx`**

A standalone modal component that receives the prayer card data and renders:

1. **Backdrop**: `fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 transition-all duration-300`

2. **Container**: `bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-3xl shadow-2xl overflow-y-auto flex flex-col relative`

3. **Close button (X)**: `absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10 bg-white/80`

4. **Content area** (`p-6 md:p-10`):
   - Title in `text-lg md:text-xl font-semibold text-slate-900`
   - Full prayer text: `text-base md:text-lg text-slate-800 leading-relaxed font-medium mb-8` with custom font support
   - Scripture section (if extended_prayer exists)
   - Labels display
   - Notes section
   - Background image with dark overlay if present, forcing `text-white`

5. **Sticky action footer**: `sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 p-4 flex items-center justify-between mt-auto`
   - Contains: Favorite (heart), Testify, Share, Pin, Playlist actions
   - Visibility toggle for owners

Props: `{ open, onClose, item (SavedPrayer), userId, onUpdate, onRemove, onRefresh, themeVars, onAddToPlaylist }`

Uses framer-motion `AnimatePresence` for enter/exit animation. Clicking backdrop closes. Escape key closes.

### Changes to `src/components/board/BoardCard.tsx`

1. Add `const [viewerOpen, setViewerOpen] = useState(false)` state
2. Change "See more" button's `onClick` to call `setViewerOpen(true)` instead of `setExpanded(v => !v)`
3. Make the card body (prayer text area) clickable to open the viewer instead of toggling collapse
4. Remove inline expansion logic (`expanded` state usage for text display — always show truncated on card)
5. Render `<PrayerViewerModal>` at the bottom of the component, passing all needed props
6. Import the new component

### Technical Details

- The modal uses `createPortal` or renders at component level (AnimatePresence handles mount/unmount)
- Body scroll lock on mobile when modal is open (add `overflow-hidden` to body)
- All existing card actions (favorite, pin, share, font, enrich, testify flip, notes, comments) are available inside the viewer
- The card grid remains stable since cards never expand inline

