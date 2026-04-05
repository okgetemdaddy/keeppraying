

## Remove "End Session" UI + Wire Intelligent Session Endings + Sleeve Enhancements

### Part 1: Remove "End Session" from BibleReader.tsx

**Delete `handleEndSession` callback** (lines 973–1014) — the entire function and its iPadOS comment.

**Delete 4 "End Session" button blocks + "What are sessions?" links:**
- Sticky toolbar block (lines 2559–2592)
- Locked canvas nav End Session button (lines 2665–2687)
- Locked canvas nav standalone End Session button (lines 2695–2719)
- Locked canvas nav "What are sessions?" link (lines 2728–2736)
- Slide-down nav block (lines 2850–2883)

### Part 2: Wire intelligent session endings

**Update `handleToggleStudyMode`** (line 1073–1083) to complete the canvas session on exit:
- When `v === false` and `activeSessionId` exists: update `study_sessions` to `complete`, fire `summarize-session` in background, log `session_end` event, clear `activeSessionId` / `activeSessionConfig`
- Add iPadOS comment about `sceneDidEnterBackground`

**Verify `handleLingerEndSession`** (line 955) already handles idle timeout for reading sessions — it does. Keep as-is.

**Add navigation-away cleanup** — a `useEffect` with cleanup that completes `activeReadingSessionId` on unmount, fires `summarize-session`, with iPadOS comment about `applicationWillResignActive`.

**Add stale session cleanup on mount** — a `useEffect` that runs once when `user` is available, queries `study_sessions` for `active`/`paused` reading sessions with `last_active_at` older than 10 minutes, batch-completes them, and fires summaries. iPadOS comment about `applicationDidBecomeActive`.

### Part 3: Enhance SessionCards in Bible Sleeve

**Update `SessionCards.tsx`:**
- Show ALL sessions (not just non-complete) — show recent completed ones too
- Add session type badge: amber "Canvas Study" pill for canvas, sky "Reading" pill for reading
- Add AI summary preview: if `session_summary` exists, show `study_arc` as italic muted subtitle
- Add empty state with book icon and explanatory text
- Add "What are sessions?" link below the cards (navigates to `/support#sessions`)

### Part 4: Upgrade Support page sessions section

**Replace the basic sessions section** (lines 486–504 in Support.tsx) with the richer three-card layout: Reading Sessions, Canvas Study Sessions, AI-Powered Summaries — each in a styled card with amber headings and zinc descriptions. Add privacy note at the bottom.

---

### Files

| File | Action |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Remove `handleEndSession` + all End Session UI, update `handleToggleStudyMode`, add stale cleanup + nav-away cleanup effects |
| `src/components/bible/SessionCards.tsx` | Add type badges, summary preview, empty state, "What are sessions?" link |
| `src/pages/Support.tsx` | Replace sessions section with richer explainer |

