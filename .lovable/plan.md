

## Part 8: Advanced Session Lifecycle & Abandonment Edge Cases

Three additions to make implicit reading sessions robust against idle states, tab closures, and scroll-only reading.

---

### 8.1: Scroll & Visibility Activity Tracking (`BibleReader.tsx`)

**Current gap**: The 30s auto-start timer and 5-minute idle timer only reset on explicit interactions (highlights, notes, bookmarks). Passive reading (scrolling) doesn't reset the idle timer or trigger session creation.

**Changes in `BibleReader.tsx`**:

- Add a `useEffect` that attaches throttled `scroll`, `touchmove`, and `pointermove` listeners to the chapter text container ref. Throttle at 2 seconds (don't spam `resetReadingInactivity` on every pixel).
- These events call `resetReadingInactivity()` to keep the idle timer alive during deep reading.
- Also reset the 30s start timer on scroll (passive reading counts as "sustained reading").
- Use a ref to the scrollable container (the chapter content area) rather than `window` to avoid capturing unrelated scroll events.

### 8.2: Ghost Session Hook — Tab Close / Abandonment (`BibleReader.tsx`)

**Current gap**: The unmount `useEffect` (line 1224) uses async Supabase calls which may not complete on tab close.

**Changes**:

- Add a `useEffect` that registers `visibilitychange` and `beforeunload` listeners.
- On `visibilitychange` to `'hidden'` or `beforeunload`, if `activeReadingSessionId` or `activeSessionId` is active:
  - Use `navigator.sendBeacon()` to POST to the Supabase REST endpoint directly (`/rest/v1/session_events`) with the `session_end` event and `{"reason": "browser_closed"}` payload. `sendBeacon` is fire-and-forget and survives tab close.
  - Also beacon an update to `study_sessions` to set `status: 'complete'`. Since sendBeacon can only POST (not PATCH), use an RPC function or just accept that the session may not be marked complete (the heartbeat will time it out server-side).
  - Alternative: use `navigator.sendBeacon` for the `session_end` event insert only (which is a POST to `session_events`), and rely on the existing heartbeat timeout to mark the session complete.
- Store `activeReadingSessionId` and `activeSessionId` in refs so the event listener closure always has the latest value.
- Add iPadOS comment: `// iPadOS: Maps to applicationWillTerminate and sceneDidEnterBackground lifecycle hooks`

**sendBeacon implementation detail**: Construct the Supabase REST URL from `import.meta.env.VITE_SUPABASE_URL` and use the anon key as `apikey` header via a `Blob` with `application/json` content type.

### 8.3: `src/components/bible/SessionLingerToast.tsx` — Idle Popup

**New component** replacing the current auto-terminate behavior on idle timeout.

**Props**:
```typescript
interface SessionLingerToastProps {
  visible: boolean;
  onResume: () => void;
  onEndSession: () => void;
}
```

**UI**: A Framer Motion floating pill (`motion.div`) at bottom center. Glassmorphic: `bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-full px-6 py-3`. Text: "Are you still studying?" in `text-sm text-zinc-200`. Two buttons: "Resume" (text-only, muted) and "End Session" (amber accent).

**Animation**: `initial={{ opacity: 0, y: 40, scale: 0.95 }}`, `animate={{ opacity: 1, y: 0, scale: 1 }}`, spring transition `stiffness: 400, damping: 25`.

**Wiring in `BibleReader.tsx`**:

- Add `showLingerToast` state (boolean).
- Modify `resetReadingInactivity`: instead of auto-ending the session on timeout, set `showLingerToast(true)` and pause logging (don't end the session yet).
- `onResume`: set `showLingerToast(false)`, call `resetReadingInactivity()` to restart the 5-min timer.
- `onEndSession`: set `showLingerToast(false)`, log `session_end` with `{"reason": "idle_timeout"}`, complete the session, trigger summary.
- **Auto-dismiss on interaction**: Add a click/scroll listener that, when `showLingerToast` is true and the event target is NOT inside the toast, auto-dismisses and resets the timer. Use a ref on the toast container for `contains()` check.

---

### Files Summary

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Scroll/touch activity listeners, `visibilitychange`/`beforeunload` ghost session hook, linger toast state + wiring, modify idle timeout to show toast instead of auto-end |
| `src/components/bible/SessionLingerToast.tsx` | New — glassmorphic idle popup with Resume/End actions |

