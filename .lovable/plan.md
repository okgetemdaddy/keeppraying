

## Fix & Build: Ghost Session Handling + Minimap Generator

Two pieces need building. The `summarize-session` edge function already exists and matches the spec — no changes needed there.

### Part 1: Ghost Session Handling — `sendBeacon` on Tab Close

**File:** `src/hooks/useSessionTelemetry.ts` (Edit)

Add a new `useEffect` that listens to `visibilitychange` and `beforeunload` to flush buffered events via `navigator.sendBeacon` when the tab closes.

Key implementation details:
- Track the current Supabase access token in a ref, updated via `supabase.auth.onAuthStateChange`
- On `visibilitychange === 'hidden'`, drain the buffer + append a `session_end` event with `{ reason: 'browser_closed' }`
- POST directly to the Supabase REST API (`/rest/v1/session_events`) with `apikey`, `Authorization`, and `Prefer: return=minimal` headers via `sendBeacon`
- `beforeunload` calls the same handler as belt-and-suspenders
- Add iPadOS comment per spec

### Part 2: `summarize-session` Edge Function

Already exists at `supabase/functions/summarize-session/index.ts` with JWT verification, Grok integration, fallback summary, and session_summary write-back. No changes needed.

### Part 3: SVG Minimap Generator

**File:** `src/lib/minimap.ts` (Create)

Pure TypeScript utility — zero React imports, zero DOM APIs. Exports:
- `MinimapStroke` and `MinimapHighlight` interfaces
- `generateChapterMinimap(strokes, highlights, containerWidth, containerHeight)` returning a raw SVG string

Three-layer rendering: abstract text lines (gray rects), highlight rects (30% opacity), ink stroke paths. Returns `""` when no annotations exist. ViewBox matches original container for automatic browser scaling.

### Summary

| Item | Status | Action |
|------|--------|--------|
| Ghost session `sendBeacon` | Missing | Add `useEffect` + token ref to `useSessionTelemetry.ts` |
| `summarize-session` edge function | Already exists | None |
| `src/lib/minimap.ts` | Missing | Create new file |

