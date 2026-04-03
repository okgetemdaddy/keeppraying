

# Premium iPadOS Waitlist Drawer — Full Redesign with Illustrated Feature Cards

## Summary
Rewrite `IPadWaitlistDrawer` to match the dark frosted-glass reference screenshot. Each of the five feature cards gets a custom inline SVG illustration rendered as a React component. The confirmation state becomes a "Spot Secured" section with a cross/heart fusion SVG. The entire drawer uses the dark glass material system.

## Technical Changes

### `src/components/bible/iPadWaitlistDrawer.tsx` — Full rewrite

**Container:**
- Dark frosted glass: `bg-black/60 backdrop-blur-[24px] backdrop-brightness-[0.8] border-r border-white/10`
- Close button: `text-white/50 hover:bg-white/10`

**Header:**
- Tablet icon in rounded-2xl amber-900/40 container (keep existing pattern but adapt to dark)
- Title: `"Waitlist Open: Experience KeepRead.ing Reimagined for iPad"` — `text-base font-bold tracking-tight text-white`
- Subtitle paragraph: verbatim copy from prompt — `text-xs text-white/50 leading-relaxed`

**Five Feature Cards** — each card has:
- A ~80×80px illustration area on the left (`rounded-xl bg-white/[0.04] overflow-hidden`) containing an inline SVG illustration
- Title + description on the right
- Card container: `rounded-xl bg-white/[0.06] border border-white/[0.08] p-3`

The five inline SVG illustrations (rendered as React components within the file):

1. **PenTipIllustration** — A stylized Apple Pencil tip pointing down with a golden highlight line beneath showing "heavens and the earth" text partially highlighted in amber
2. **InfiniteCanvasIllustration** — A tilted page/canvas with faint handwritten-style text lines and expansion arrows, warm amber accent lines
3. **SplitScreenIllustration** — Two side-by-side panels labeled "ESV" and "NIV" with faint text lines inside, separated by a thin divider, amber accent on the labels
4. **OCRIllustration** — A search bar at top with "Q Search search..." placeholder, below it cursive "Deep wisdom..." text with an arrow pointing to clean typed "Deep wisdom" text
5. **CrossRefIllustration** — A page with faint text lines and a floating popup/card overlaying it, showing referenced text

Each SVG uses the copper-gold palette (`#d4a574`, `#b8956a`, `rgba(212,165,116,0.3)`) on dark backgrounds.

**Feature card data:**
1. Title: "Individual Word Selection and Granular Highlighting" / Desc: "Highlight precise words and partial phrases, not just entire verses, for truly inductive study. No more forced block highlighting."
2. Title: "Infinite Margin Space" / Desc: "A canvas that dynamically expands horizontally and vertically for notes, reflections, and hand-drawn diagrams, keeping insights alongside the text."
3. Title: "True Multi-Translation Split-Screen" / Desc: "Compare different versions side-by-side with independent scrolling and seamless annotation for detailed comparative analysis."
4. Title: "Searchable Handwriting (OCR)" / Desc: "Search all your handwritten notes globally, bridging the tactile feel of analog with digital search utility."
5. Title: "Seamless Cross-Referencing" / Desc: "Instantly view referenced texts in non-disruptive floating pop-ups and gestures, without navigating away from the current page."

**Email Form:**
- Styled for dark surface: `bg-white/5 border-none text-white placeholder:text-white/30`
- Submit button: `bg-amber-700/40 hover:bg-amber-600/50 text-amber-200`

**Confirmation State ("Spot Secured"):**
- Replaces email form after submission
- Dark card: `bg-white/[0.04] border border-amber-500/20 rounded-xl p-5 text-center`
- Bold header: `"Spot Secured."` — `text-lg font-bold text-white font-serif`
- Body: verbatim copy from prompt — `text-xs text-white/50 leading-relaxed`
- Below text: custom cross/heart fusion SVG icon (~32px), copper-gold colored, centered

**Cross/Heart Fusion SVG:**
A single inline SVG combining a heart silhouette with a cross integrated into the center — matching the icon visible at the bottom of the reference screenshot.

**SleeveWaitlistInput:** Unchanged.

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/iPadWaitlistDrawer.tsx` | Full rewrite of `IPadWaitlistDrawer` with dark glass aesthetic, 5 inline SVG illustrations, new copy, cross/heart confirmation |

