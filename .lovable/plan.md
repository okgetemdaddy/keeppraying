

## Fix Testify Button in Theater Modal

### Problem
The Testify button in `PrayerViewerModal.tsx` (line 437-443) has **no `onClick` handler** — it's purely decorative. In `BoardCard`, clicking Testify flips the card to show `TestifyBack`, which lets users write their testimony.

### Solution
Add a Testify flow inside the modal. Two options:

1. **Show TestifyBack inline in the modal** — when Testify is clicked, swap the prayer content with the `TestifyBack` component inside the theater viewer. This keeps the user in the immersive reading experience.

### Changes

**`src/components/board/PrayerViewerModal.tsx`**
- Import `TestifyBack` from `./TestifyBack`
- Add `const [testifying, setTestifying] = useState(false)` state
- Wire the Testify button: `onClick={() => setTestifying(true)}`
- When `testifying` is true, render `<TestifyBack>` in place of the prayer content area, with a "Back to prayer" option
- Pass `onFlipBack={() => setTestifying(false)}` plus the card's `id`, `created_by`, accent/text colors to `TestifyBack`
- When testimony is submitted (TestifyBack handles this), flip back to prayer view

No other files need changes.

