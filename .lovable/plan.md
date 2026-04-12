
I understand the issue now, and the problem is simpler than the last fixes treated it.

What is actually wrong
- `PrayerCardMobile.tsx` is currently mixing two conflicting sizing models:
  - natural-height cards for normal/compact board usage
  - `flex-1 min-h-0` fullscreen/fill behavior
- When the card flips, `TestifyBack` is forced into the same large container, so the back side inherits too much height and creates dead space.
- The explicit opacity/visibility hack helped bleed-through, but the real UX problem is height ownership: the shell is dictating height instead of the mode.

What I will fix
1. Rework card height rules in `src/components/board/PrayerCardMobile.tsx`
- `compact` = intentionally short card
- `default` = one consistent board card height
- `fullscreen` = fixed stage height, non-scrollable page, only internal prayer text scrolls
- flipped/testify on board cards = card height shrinks to the testimony content instead of keeping the front-face board height

2. Separate front-height logic from back-height logic
- Stop making the back face inherit fullscreen/default board height when it should size to testimony content
- Keep the 3D flip shell, but make board variants use explicit mode heights instead of flex growth
- Keep fullscreen as its own fixed-height stage only

3. Fix bleed-through correctly
- Keep `backfaceVisibility`
- Keep explicit visual hiding on the front while flipped
- But do not absolute-stretch both faces in board modes if that forces oversized empty space

4. Make `TestifyBack` cooperate with card-sized contexts
- Add a size/context prop to `TestifyBack` so it can render differently inside:
  - compact board flip
  - normal board flip
  - fullscreen prayer page
- On board flips, default testimony list should fit naturally inside the card without requiring hunting/scanning for controls
- Preserve richer/fullscreen testimony experience only on fullscreen prayer page

5. Preserve the canonical card rules
- No redesign
- No glow removal
- No alternate prayer card visual system
- Only height behavior and flip containment change

Files to update
- `src/components/board/PrayerCardMobile.tsx`
- `src/components/board/TestifyBack.tsx`

Implementation approach
- Introduce explicit card shell heights in `PrayerCardMobile` by variant instead of relying on `flex-1`
- Keep normal board cards equal-height
- Keep compact cards shorter
- When flipped in board modes, let the testimony side use a smaller/natural card height path
- Reserve full-height/fixed-stage behavior for `fullscreen` only
- Add a compact/board-aware testimony layout in `TestifyBack` so buttons stay in view and dead space is eliminated

Acceptance criteria
- Compact mode shows a short prayer card
- Normal mode shows equal-height prayer cards
- Clicking Testify on a board card shrinks the card to the testimony content instead of leaving giant empty space
- Flipped cards do not require scrolling around to locate controls
- Front text does not bleed through on flip
- Fullscreen prayer page remains non-scrollable, with only internal text areas scrolling
- Glow and canonical prayer-card styling remain intact

Technical detail
- The current regression comes from `PrayerCardMobile` using fullscreen-style `flex` sizing inside the flip container and applying one sizing strategy to all modes.
- The correction is to make height mode-driven:
```text
compact    -> short fixed/min height
default    -> consistent equal board height
fullscreen -> fixed viewport stage height
flipped(board) -> content-sized/testify-sized
```
- `TestifyBack` also needs a context prop so it does not render the full fullscreen testimony experience inside a compact board flip state.

I will implement only that targeted height correction, not another redesign.
