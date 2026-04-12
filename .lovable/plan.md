
Decision after audit: I do not need new product direction from you. The problem is source-of-truth drift. Yes, the written guardrails should be updated, because the code currently allows multiple prayer-card implementations to drift away from the DesignLab card you already defined.

What I found
- `/design-lab` renders `PrayerCardAsset` (your actual visual truth)
- `/boardv2` mobile renders `PrayerCardMobile`
- layered stack renders `LayeredCard`
- mobile focus renders `FocusMode`
- desktop focus renders `PrayerCard`
- `/prayer` has its own standalone prayer page UI
- `/shared` has its own standalone prayer display
- `/explore` also uses `PrayerCardMobile`

That is why behavior, theming, bar buttons, and focus interactions keep breaking.

Plan

1. Re-establish the source of truth
- Make the DesignLab prayer card the enforced source of truth for the app
- The exact component rendered on `/design-lab` will be the same component used on board, focus page, prayer page, explore, and shared prayer views
- Add explicit guardrail notes in:
  - `CLAUDE_HANDOFF.md`
  - `.lovable/plan.md`
  - the prayer card file header
- Rule: no alternate visual prayer-card implementations

2. Collapse to one prayer-card implementation
- Keep one real prayer-card file only
- Remove visual duplication from:
  - `LayeredCard.tsx`
  - `FocusMode.tsx`
  - `PrayerCardMobile.tsx`
  - any duplicate fullscreen prayer UI in `Prayer.tsx`
- If import compatibility is needed during transition, wrappers can temporarily re-export the same card, but there will be only one visual implementation

3. Make focus mode a prayer page/stage, not a different card
- Replace the custom focus UI with a full-screen prayer page/stage that renders the same DesignLab card
- The page itself will not scroll
- Only the prayer-text area inside the card will scroll
- Full button bar stays intact
- Same glow, same breathing, same theme, same drawers, same flip behavior

4. Preserve the layered interaction exactly as requested
- In layered mode:
  - first tap on a back card brings it to the front
  - second tap, once front, opens that prayer in its dedicated full-screen prayer stage
- No condensed mini-bar, no alternate stripped-down card

5. Enforce context-based visibility instead of different card designs
- Owner board: show full bar including privacy dot and 3-dot menu
- Public/explore/shared/anon: use the same card, but hide owner-only controls only
- Keep visible for public/anon:
  - prayed
  - comments
  - pin/save
  - share
  - listen
  - testify
- If anon taps an auth-required action, use the existing graceful join prompt

6. Route alignment
- `BoardV2.tsx`: use the one card in normal, layered, and focused states
- `Prayer.tsx`: become the dedicated secure prayer page using that same card
- `SharedPrayerLanding.tsx`: keep the hero/landing wrapper, then show the same prayer page/card experience
- `ExploreMobile.tsx`: use the same card with public-view rules
- `DesignLab.tsx`: remain the visual proof page for the exact same component

Files to change
- Primary: prayer-card source file, `BoardV2.tsx`, `Prayer.tsx`, `SharedPrayerLanding.tsx`, `ExploreMobile.tsx`, `DesignLab.tsx`
- Retire duplicates: `LayeredCard.tsx`, `FocusMode.tsx`, duplicate mobile/fullscreen prayer-card logic
- Docs: `CLAUDE_HANDOFF.md`, `.lovable/plan.md`

Acceptance criteria
- One prayer card visual implementation only
- DesignLab and live app render the same prayer card
- Focus view is a non-scrollable prayer page/stage, with only card text scrolling
- Layered tap behavior works exactly: front first, open second
- Full button bar remains intact in focus
- Public vs owner differences are handled by visibility rules, not separate card designs
- Light/dark theme, glow, and bar styling stay perfectly in sync everywhere
