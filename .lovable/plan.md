

## Re-add Conditional Touch Suppression for Apple Pencil Drawing

### Problem
iPadOS Safari fires both pointer AND touch events for Apple Pencil. `preventDefault()` on the pointer event does not cancel the companion touch event, so the browser still interprets pen strokes as scroll gestures.

### Solution
Add back the global touch suppression `useEffect` that was previously removed, but it now works correctly because `isDrawingRef.current` is only set to `true` during active pen or finger-draw strokes — finger scroll is unaffected.

### Change

**`src/components/bible/InkOverlay.tsx`** — Insert one `useEffect` block after the keyboard undo effect (after line 544):

```ts
/* ── Suppress touch events from Apple Pencil during drawing ── */
useEffect(() => {
  const suppress = (e: TouchEvent) => {
    if (isDrawingRef.current) {
      e.preventDefault();
    }
  };
  document.addEventListener("touchstart", suppress, { passive: false });
  document.addEventListener("touchmove", suppress, { passive: false });
  return () => {
    document.removeEventListener("touchstart", suppress);
    document.removeEventListener("touchmove", suppress);
  };
}, []);
```

No other files need changes.

