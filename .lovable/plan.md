

## Refactor: Unified Tab Navigation for Suggestions & iPad App Banners

### Problem
The two vertical banners ("Suggestions" and "iPad App") use absolute positioning with manual margin offsets, causing visual clipping and overlap as shown in the screenshot.

### Solution
Replace both banner components with a single `BibleEdgeTabs` component that uses an inline flex container with Framer Motion `layoutId` for the active indicator — exactly matching the user's specification.

### Files to Change

**1. Create `src/components/bible/BibleEdgeTabs.tsx`** (new file)
- Inline flex container with `bg-[#1A1D24] rounded-full overflow-hidden p-1`
- Two tab buttons: "SUGGESTIONS" (Lightbulb icon) and "IPAD APP" (Tablet icon)
- iPad App tab conditionally hidden if `ipad_waitlist_dismissed` is set in localStorage
- Active tab gets a `<motion.div layoutId="activeTabIndicator">` background with `absolute inset-0 z-0` and amber/orange styling
- Text/icons wrapped in `<span className="relative z-10 flex items-center gap-2">`
- Component accepts `onSuggestionsClick` and `onIPadClick` callbacks — clicking a tab fires the callback and sets it as active briefly (or just fires the click immediately)
- Positioned at the left edge of the toolbar using standard flow (not absolute/rotated) — placed as a vertical rotated element or kept horizontal depending on the design intent

Since the screenshot and current code show these as rotated vertical tabs along the left edge, the container will be:
- `absolute left-0 top-full z-20` on the toolbar wrapper
- `transform: rotate(-90deg)` with `transformOrigin: "left top"` 
- But now as a single flex group, no overlap possible

**2. Delete or deprecate:**
- `src/components/bible/SuggestionBanner.tsx` — remove
- `src/components/bible/iPadWaitlistBanner.tsx` — remove

**3. Update `src/components/bible/BibleReader.tsx`**
- Replace the two separate banner imports/renders (lines 112-115, 1944-1949) with a single `<BibleEdgeTabs>` component
- Pass `onSuggestionsClick={() => setSuggestionDrawerOpen(true)}` and `onIPadClick={() => setWaitlistDrawerOpen(true)}`
- Conditionally hide iPad tab based on `isIPhone` and localStorage dismissal
- Hide the entire component in focus mode (existing pattern)

### Technical Details

```
┌─────────────────────────────────────────┐
│  Toolbar (sticky, relative)             │
│                                         │
│  ┌──────────────────────────────┐       │
│  │ [💡 SUGGESTIONS] [📱 IPAD APP] │ ← single rotated flex container
│  └──────────────────────────────┘       │
│  ↑ absolute left-0 top-full, rotated    │
└─────────────────────────────────────────┘
```

The active tab indicator uses `layoutId="bibleEdgeTab"` so it smoothly animates between tabs with a spring transition (`stiffness: 400, damping: 30`).

