

# Standardize Prayer Card Action Bars

## Problem
Prayer cards have two completely separate action bar implementations based on card size:
- **Small/Medium cards** (footer, lines 788-896): Shows Prayed button → Testify → ActionButtons (Heart, Pin, Listen, Share, ⋯ menu)
- **Large cards** (lines 898-934): Shows only Visibility toggle → Testify in the bottom bar, while ActionButtons sit in the top-right header. No Prayed button in the bottom bar at all.

This means different cards on the same board show different icons in different places depending on their size. The user sees inconsistency.

## Solution
Extract a single unified `CardFooter` component used by ALL card sizes, so every prayer card shows the exact same action bar layout regardless of size.

### Unified Footer Layout (left-to-right)

```text
[ Visibility toggle (owner only) ] ---- [ Prayed | Heart | Pin | Listen | Share | Testify | ⋯ Menu ]
```

- **Left side**: Private/Public toggle with switch (owner only)
- **Right side**: All action icons in a fixed, deterministic order — always the same set, same order
- Voice cards and breath cards get the same footer — no special-casing
- The `⋯` dropdown menu contents remain the same (size, font, enrich, image, etc.)

### Safeguards Against Future Divergence
- Delete the two separate rendering blocks (lines 788-896 and 898-934)
- Replace with a single `<CardFooterBar>` inline component rendered unconditionally after the collapsible chrome section
- Remove the `actionsInFooter` boolean entirely — there's only one path now
- Remove the separate `ActionButtons` rendering in the top-right header for large cards (lines 598-625)

### Changes — `src/components/board/BoardCard.tsx`

1. **Remove** `const actionsInFooter = size !== "large"` (line 430)
2. **Remove** the large-card top-right ActionButtons block (lines 598-625)
3. **Remove** both separate footer sections:
   - Small/medium footer (lines 788-896)
   - Large card bottom bar (lines 898-934)
4. **Add** a single unified footer section after the collapsible chrome `</AnimatePresence>`, containing:
   - Left: visibility toggle (owner-only, same logic)
   - Right: Prayed button, Heart, Pin, Listen, Share, Testify (if public), then ActionButtons `⋯` menu (dropdown only — the inline heart/pin/listen/share buttons move out of ActionButtons into the footer directly)
5. **Simplify `ActionButtons`** to only render the `⋯` dropdown menu button + its contents (remove the inline heart/pin/listen/share from it since those are now in the unified footer)

This guarantees every card — regardless of size, type (standard, voice, breath), or ownership — renders the exact same action bar with the same icons in the same order.

## Files Changed

| File | Change |
|------|--------|
| `src/components/board/BoardCard.tsx` | Remove dual footer paths; create single unified footer; simplify ActionButtons to dropdown-only; remove `actionsInFooter` flag |

