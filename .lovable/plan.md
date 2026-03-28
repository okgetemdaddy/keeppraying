
Root cause: the “theater” viewer itself is coded, but it is mounted inside each `BoardCard`, and each card uses `perspective`/3D transforms. That makes the modal’s `fixed` layer behave like it belongs to the card on desktop, which is why you keep seeing the narrow elongated version. So yes — the right move is to effectively replace the current `See more` implementation from scratch.

Plan:

1. Rebuild the viewer mounting strategy
- Stop rendering the prayer viewer inside `BoardCard`.
- Move the open/close state and selected prayer up to `Board.tsx`.
- Open the viewer from card click / `See more…` by sending the selected prayer to a single top-level viewer.
- Render one viewer above the board so it truly takes over the whole screen on desktop and mobile.

2. Simplify `BoardCard.tsx`
- Delete the local `viewerOpen` flow entirely.
- Remove dead inline-expansion leftovers like the unused `expanded` state.
- Keep cards permanently truncated in-grid.
- Make the prayer text/card surface and `See more…` trigger a parent callback instead.
- Remove all underlines from `See more…`, `Scripture`, `Labels`, and similar prayer-card links.
- Change the scripture label to `Scripture` / `Hide Scripture`.

3. Rebuild the theater layer cleanly
- Keep the dark cinematic backdrop and glowing animated border, but render it at the page level.
- Preserve:
  - big X close button
  - `See less…` exit
  - Escape key close
  - backdrop click close
  - body scroll lock
- Keep the prayer layout optimized for long-form reading, selection, and generous spacing.
- Keep all bottom actions aligned in the sticky footer.

4. Make desktop/mobile behavior explicit
- Desktop: centered floating reading window with strong dimming and glow.
- Mobile: full-screen reader with natural scrolling.
- Ensure the footer stays usable without causing the old stretched-column feel.

5. Clean up the current broken implementation
- Remove the current card-anchored modal wiring so there is only one source of truth.
- Verify there are no remaining transformed ancestors affecting the overlay.
- Keep the same prayer actions/data behavior, just attached to the new page-level viewer.

Technical note
- The key fix is architectural, not visual: the viewer should be rendered from `Board.tsx` (or via a portal to `document.body`), not from inside the transformed card component. That is what will stop the desktop version from collapsing into the original elongated card-like modal.
