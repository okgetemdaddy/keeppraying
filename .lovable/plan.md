

## Three Fixes: Pencil Touch Guard, Onboarding Drawer, Toast Positioning

### Fix 1 — Guard PaperCanvas touch handlers against pencil events

**File:** `src/components/bible/PaperCanvas.tsx`

Add a `gestureStarted` flag alongside existing tracking variables (around line 127). Guard both `onTouchStart` and `onTouchEnd`:

- In `onTouchStart`: set `gestureStarted = true` only when entering the 2-finger or 3-finger branches
- Replace `onTouchEnd` with:
```ts
const onTouchEnd = (e: TouchEvent) => {
  if (!gestureStarted) return;
  if (e.touches.length > 0) return; // still fingers on screen
  gestureStarted = false;
  gestureType = "none";
  intent = "none";
  accumulatedPan = 0;
  accumulatedZoom = 0;
};
```

This prevents pencil lifts (single-touch events) from resetting gesture tracking mid-pinch.

### Fix 2 — Remove pencil onboarding drawer open in PaperCanvas mode

**File:** `src/components/bible/BibleReader.tsx` (lines 2489-2495)

Change the `onPencilFirstContact` callback to set the localStorage flag without opening the pocket drawer:

```tsx
onPencilFirstContact={() => {
  const onboarded = localStorage.getItem("pencil-onboarded");
  if (!onboarded) {
    localStorage.setItem("pencil-onboarded", "true");
  }
}}
```

### Fix 3 — Reposition toasts to top-right with premium styling

**File:** `src/components/ui/sonner.tsx`

Update the `Sonner` component to use `position="top-right"` and add premium styling via `toastOptions.style`:

```tsx
<Sonner
  theme="system"
  className="toaster group"
  position="top-right"
  offset={16}
  toastOptions={{
    style: {
      marginTop: '60px',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      padding: '12px 16px',
      fontSize: '13px',
    },
    classNames: { /* keep existing classNames */ },
  }}
/>
```

**File:** `src/components/keepreading/KeepReadingShell.tsx` — same `<Sonner>` is rendered here; it imports from `sonner.tsx` so the change propagates automatically.

### Summary

| File | Change |
|------|--------|
| `PaperCanvas.tsx` | Add `gestureStarted` flag, guard `onTouchEnd` against pencil lifts |
| `BibleReader.tsx` | Remove `setPocketOpen(true)` from `onPencilFirstContact` |
| `sonner.tsx` | Position top-right, add premium toast styling |

