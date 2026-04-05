

## Fix: Bible Sight Auto-Closing on `[GENERATE_STUDY]`

### Problem

When the AI model includes a `[GENERATE_STUDY]` marker in its response, the drawer automatically:
1. Sets `generatingStudy = true` (shows a loading spinner)
2. After 1.5s, calls `onTriggerDeepStudy()` to start a Deep Study
3. Calls `onOpenChange(false)` to close Bible Sight

This is unwanted — the chat should simply continue and the user should decide when to leave.

### Fix

**File: `src/components/bible/BibleSightDrawer.tsx`**

- Remove the entire `[GENERATE_STUDY]` auto-trigger block (lines 153–187). The marker text will just be stripped from the displayed content so it doesn't show as raw text, but no drawer closing or Deep Study triggering will occur.
- Remove the `generatingStudy` state and all UI referencing it (the "Generating your study session…" spinner block and the `disabled` checks on the input).
- Keep the chat log save logic — move it to run on every assistant response (or keep it only for `[GENERATE_STUDY]` tagged responses as a save-point, but without closing).

### Result

Bible Sight stays open. The user can keep chatting. No automatic Deep Study launch. The `[GENERATE_STUDY]` marker is silently stripped from display text and the chat log is saved, but nothing else happens.

### Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BibleSightDrawer.tsx` | Remove auto-close/auto-trigger logic; strip `[GENERATE_STUDY]` from display only; remove `generatingStudy` state and its UI |

