

## Complete Session Telemetry Wiring — Parts 5, 7, and Handler Integration

### Part 5: iPad Nav Lock in `BibleReader.tsx`

**Nav overlay (lines ~2456–2518)**: When `isInPaperCanvas && activeSessionConfig`, replace the book/chapter/version `Select` dropdowns with a locked session indicator showing the verse range, "Session Active" label, and a live elapsed timer. The close button and secondary toolbar controls (sleeve, study mode toggle, export, focus, search, text size, reading mode, pocket) remain accessible.

Specifically:
- Lines 2456–2518: Wrap the title + three `Select` dropdowns block in a conditional. When locked, render `Lock` icon + `activeSessionConfig.verseRange` + "Session Active" + formatted `liveElapsed` timer. The `liveElapsed` state and interval already exist (lines 908–924).
- Lines 2662–2709: The chapter header is already gated by `!isInPaperCanvas` — no change needed.
- Lines 2674–2696: The tapNavMode arrows inside the chapter header are already hidden by the `!isInPaperCanvas` gate — no change needed.
- Lines 2979–3000: Bottom chapter nav is already gated by `!isInPaperCanvas` — no change needed.
- Lines 3425–3434: Gate `ChapterThumbnailStrip` render with `!isInPaperCanvas` so it can't be triggered during canvas sessions.
- Import `Lock` from lucide-react (add to existing import on line 4).
- Add iPadOS port comment.

**Elapsed timer formatting**: Inline helper `formatElapsed(seconds)` → `mm:ss` or `h:mm:ss`. No new component — just a format function used in the JSX.

### Part 7: Wire SessionReviewDrawer into BibleSleeveSheet

**`BibleSleeveSheet.tsx`**:
- Add state: `reviewSession`, `reviewEvents`, `reviewLoading`.
- Add `handleOpenReview(session)` that sets state, lazy-fetches `session_events`, and auto-triggers `summarize-session` if `session_summary` is null.
- Import `SessionReviewDrawer` and `supabase` client.
- Render `<SessionReviewDrawer>` at the bottom of the component.
- Cache: skip fetch if `reviewEvents` already has data for the same `session.id`.

**`SessionCards.tsx`**:
- Add an `onReview` prop alongside `onResume`.
- Split click targets: card body → `onReview(session)`, Resume button → `onResume(session)` with `e.stopPropagation()`.

**`BibleSleeveSheet.tsx` wiring**: Pass `onReview={handleOpenReview}` to `SessionCards`.

### Telemetry Handler Integration in `BibleReader.tsx`

Add a unified telemetry reference:
```ts
const currentTelemetry = activeSessionId ? canvasTelemetry : readingTelemetry;
```

Then add single `logEvent` lines to these existing handlers (no restructuring):

| Handler | Location | Event |
|---------|----------|-------|
| `handleHighlight` | ~line 1902 | `highlight_added` with verse, color, snippet |
| `handleRemoveHighlight` | ~line 2161 | `highlight_removed` with verse |
| `handleSaveNote` | ~line 1933 | `note_written` with verse, snippet |
| `handleToggleBookmark` | ~line 1910 | `bookmark_added` / `bookmark_removed` |
| `handleInkStrokeComplete` | ~line 1278 | `ink_stroke` with annotation_key, stroke_count |
| `handleCrossRef` | ~line 1924 | `cross_ref_nav` with verse |
| `onUnderlineGesture` | ~line 2818 | `highlight_added` with source: 'pencil_underline' |
| Chapter nav (reading sessions) | Multiple `setChapterIdx` calls | `chapter_nav` — wrap in a helper |

### Edge Function Deploy Comment

Add deploy/test comment block to top of `supabase/functions/summarize-session/index.ts`.

### Files Summary

| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Nav lock conditional, telemetry logEvent calls in handlers, Lock import, ChapterThumbnailStrip gate |
| `src/components/bible/BibleSleeveSheet.tsx` | Review drawer state, lazy fetch, auto-summary trigger, render drawer |
| `src/components/bible/SessionCards.tsx` | Add `onReview` prop, split card body vs Resume click targets |
| `supabase/functions/summarize-session/index.ts` | Add deploy comment block at top |

