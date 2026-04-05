

## Add "End Session" Button + "What are sessions?" Link

### Overview
Add a prominent glassmorphic "End Session" button visible in all nav states when a session is active, plus a subtle "What are sessions?" link. Add a sessions explainer section to the Support page.

---

### File Changes

#### 1. `src/components/bible/BibleReader.tsx`

**New `handleEndSession` callback** (near line ~970, after `handleLingerEndSession`):
- Determines active session ID (`activeSessionId ?? activeReadingSessionId`)
- Updates `study_sessions` status to `complete` with timestamps
- Logs `session_end` event with `{ reason: "user_explicit" }`
- Fire-and-forget calls `summarize-session` edge function
- If canvas session: exits study mode, clears `activeSessionId`, `activeSessionConfig`, localStorage
- If reading session: clears `activeReadingSessionId`
- Shows `toast.success("Session saved ✦", { description: "..." })`
- iPadOS comment about UIBarButtonItem mapping

**End Session button in locked canvas nav** (line ~2586, after elapsed timer span):
- Add the red glassmorphic `motion.button` with hover handlers inside the existing flex row, before the close button

**End Session button in sticky toolbar Row 2** (line ~2514, after reading mode toggle, before Bible Pocket button):
- Conditionally render when `activeSessionId || activeReadingSessionId` is truthy
- Same red glassmorphic `motion.button` style

**End Session button in slide-down nav secondary toolbar** (line ~2700, after focus mode button):
- Same conditional + same styled button

**"What are sessions?" link** — rendered below each End Session button placement:
- `<button onClick={() => navigate("/support#sessions")}>`
- Tiny text: `text-[0.6rem] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 decoration-zinc-700`
- In the locked nav: second row below the indicator
- In sticky toolbar: inline next to End Session button
- In slide-down nav: below End Session button

#### 2. `src/pages/Support.tsx`

Add a `<section id="sessions">` block at the bottom of the page (before closing tags) with:
- "Study Sessions" heading (serif)
- Two paragraphs explaining automatic session tracking and iPad vs reading modes
- `{/* TODO: Expand with screenshots, video walkthrough, and FAQ */}`

**Scroll-to-anchor**: Add a `useEffect` that checks `location.hash === "#sessions"` and scrolls the element into view on mount.

---

### Technical Details

| Aspect | Detail |
|--------|--------|
| Button style | Red glassmorphic: `rgba(220,38,38,0.15)` gradient bg, `rgba(220,38,38,0.3)` border, `#f87171` text, `backdrop-blur(12px)`, `rounded-full`, `text-xs font-semibold` |
| Animation | `framer-motion` `whileTap={{ scale: 0.97 }}` |
| Hover | Inline style manipulation via `onMouseEnter`/`onMouseLeave` |
| Session end flow | DB update → telemetry log → background AI summary → state cleanup → toast |
| Help link target | `/support#sessions` (reuses existing Support page) |
| Files changed | `BibleReader.tsx`, `Support.tsx` |

