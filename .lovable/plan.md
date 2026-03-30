
Goal: fix the real blocker so the premium prayer card is visibly present as a floating card in premium view, instead of text being painted directly on the full-screen image.

What I found
- Your screenshot matches the /board theater view, not the standalone /prayer page.
- The real problem is in `src/components/board/PrayerViewerModal.tsx`, not the transparency logic.
- Right now that modal turns the entire viewer into the background image:
  - outer theater container gets the image (`PrayerViewerModal.tsx` around lines 233-256)
  - prayer text is rendered directly on top of that full-page image (`PrayerViewerModal.tsx` around lines 268-340)
- That means there is no inner floating prayer card in theater mode, so:
  - the card “disappears” conceptually because it is never rendered as its own shell
  - the three-dot owner menu is also absent there
- By contrast, the actual board card already has the correct structure:
  - one outer container
  - one inner prayer card shell
  - optional uploaded image inside the card only
  - content layered above that card image
  (`src/components/board/BoardCard.tsx` around lines 422-459)

Plan
1. Rebuild `PrayerViewerModal` to preserve the prayer card shell
- Keep the dark theater backdrop for the page.
- Add a centered inner `prayer-card-premium` card inside the modal.
- Move the uploaded image from “entire modal background” to “background of the inner card only”.
- Render title, prayer text, labels, notes, and footer inside that inner card.

2. Make theater mode visually match the rest of the prayer-card system
- Reuse the same layering pattern as `BoardCard`:
  - card shell
  - optional image layer inside the card
  - dark image overlay inside the card
  - readable content above it
- Keep the modal backdrop behind the card so the card clearly floats above the page.

3. Restore owner controls where they belong
- Add the owner-only three-dot settings trigger inside the premium card header in `PrayerViewerModal`.
- Keep your existing three-dot interaction pattern; do not replace it.
- Wire it to the same creator/default card settings model already used on the prayer page.

4. Correct the opacity behavior
- Remove the forced “40% minimum” workaround on the standalone prayer page because it is hiding the real issue and does not match your request.
- Default creator card opacity to fully solid unless the creator explicitly changes it.
- Keep text and footer readable independently from the card background.

5. Verify uniformity across all prayer-card surfaces
- `/board` collapsed card
- `/board` theater modal
- `/prayer/:id`
All three should show the same prayer-card identity, with the only intentional difference being:
- on `/prayer/:id`, the uploaded image can also influence the surrounding page presentation
- on `/board`, the uploaded image stays inside the card

Files to change
- `src/components/board/PrayerViewerModal.tsx`
  - main fix: render a true floating inner card instead of using the full modal as the card
  - add owner three-dot menu in the card header
- `src/pages/Prayer.tsx`
  - remove the temporary opacity clamp and restore default fully visible behavior
- Possibly a small shared extraction if needed:
  - shared card-shell helper/styles only if duplication becomes too messy

Technical notes
- No database changes are needed.
- The bug is architectural/layout, not storage/RLS.
- The current wrong structure is:
```text
Modal
└── full-screen image
    └── text directly on image
```
- The correct structure should be:
```text
Theater backdrop
└── floating prayer card
    ├── card image background (optional)
    ├── card overlay
    └── card content + owner menu + footer
```

Expected result
- In premium view, you will finally see an actual prayer card floating above the background.
- The three-dot menu will exist where a card owner expects it.
- The premium card will stay visually uniform with the rest of the site instead of turning into a full-page text-over-image layout.
