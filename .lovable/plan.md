
Goal: keep the mobile bottom navigation and floating action button visible on /assistant while ensuring the chat composer and last messages always sit above them and remain easy to tap.

What I found
- The current /assistant page uses a normal page-level sticky composer:
  - `src/pages/PrayerAssist.tsx:290` → `sticky bottom-0`
- The mobile nav and FAB are global fixed overlays:
  - `src/components/MobileTabBar.tsx:24` → fixed at bottom with safe-area padding
  - `src/components/PrayerFAB.tsx:114` → fixed near bottom-right at `bottom-20`
- Previous attempts failed because they changed only one layer at a time:
  - adding inner padding to the composer did not move the composer itself
  - hiding nav/FAB removed obstruction but broke navigation
- The real issue is layout ownership: /assistant is not reserving vertical space for the fixed overlays that sit above it.

Implementation plan
1. Restore global mobile navigation on /assistant
- In `src/App.tsx`, stop excluding `/assistant` from `MobileTabBar` and `PrayerFAB`.
- Keep those app-shell overlays globally present as intended.

2. Reserve bottom space inside the assistant page
- In `src/pages/PrayerAssist.tsx`, give the scrolling content and composer a shared mobile “bottom inset” that accounts for:
  - tab bar height
  - safe-area inset
  - FAB footprint on the lower-right
- Practical approach:
  - wrap the page content in a mobile-aware layout with extra bottom padding
  - add larger bottom padding to the messages container so the last message never disappears behind the composer/nav
  - set the composer container to sit above the tab bar using a bottom offset on mobile instead of `bottom-0`

3. Make the composer clear of the FAB as well
- The FAB sits at the lower-right and can still overlap the send button / textarea region even if the tab bar is handled.
- In `src/pages/PrayerAssist.tsx`, on mobile:
  - add extra right padding or constrained width on the composer row so the send button and text field do not live under the FAB’s hit area
  - keep desktop unchanged

4. Keep desktop behavior untouched
- Scope all bottom-offset changes to mobile only (`sm:` and below behavior reversed appropriately).
- Desktop should continue using the current sticky composer behavior with no extra reserved space.

5. Optional cleanup for consistency
- Introduce a small shared constant/class strategy for mobile bottom overlay spacing so /assistant and any future chat-like pages use the same spacing model instead of hardcoded one-off values.

Proposed code direction
- `src/App.tsx`
  - revert to always rendering:
    - `MobileTabBar`
    - `PrayerFAB`
- `src/pages/PrayerAssist.tsx`
  - change the page from a plain `min-h-screen flex flex-col` layout to one that reserves bottom room for global overlays
  - update:
    - outer page/container bottom padding
    - messages area bottom padding
    - composer wrapper from `sticky bottom-0` to a mobile offset such as `bottom-[calc(tabbar+safe-area)]`
    - composer inner layout to avoid FAB overlap on the right

Why this will work
- Fixed overlays do not participate in normal document flow.
- The assistant page must explicitly budget for them.
- Once the page reserves space and the composer is offset above the overlays, users keep:
  - bottom tab navigation
  - floating action access
  - a fully visible, tappable chat input

Technical details
```text
Current stacking:
[page content]
[sticky composer at bottom: 0]
[fixed mobile tab bar]
[fixed FAB]

Correct stacking:
[page content with reserved bottom space]
[composer offset above nav]
[fixed mobile tab bar]
[fixed FAB sitting beside, not over, the composer tap targets]
```

Files to update
- `src/App.tsx`
- `src/pages/PrayerAssist.tsx`

Verification I would perform after implementation
- Mobile viewport on `/assistant`
- Confirm:
  - textarea is fully visible
  - send button is tappable
  - voice/talking affordance area is not obscured if present
  - last assistant message can scroll above the composer
  - bottom nav remains visible and usable
  - FAB remains visible and does not cover input controls
