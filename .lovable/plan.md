
## What needs to change

### Places missing VerseLinks (plain text verse citations):

1. **Blog.tsx (line 35)** — `"Your word is a lamp to my feet and a light to my path." — Psalm 119:105` → wrap `Psalm 119:105` in `<VerseLink>`

2. **BlogPost.tsx (line 95)** — same quote at the bottom of every blog post → same fix

3. **Auth.tsx (line 66)** — `— Matthew 6:6` below the hero quote → add `<VerseLink reference="Matthew 6:6" ...>` (styled white to match the overlay)

4. **Index.tsx Lord's Prayer section (lines 521-523)** — `Matthew 6:9–13` is plain text. After the prayer lines, add a `<VerseLink reference="Matthew 6:9-13">` badge below the prayer

5. **Prayer.tsx (line 156)** — `extended_prayer` blockquote is rendered as plain text with no verse detection → apply the same `renderWithVerseLinks` parser from `Prayers.tsx`

6. **WarRoom.tsx (line 135)** — `currentPrayer.extended_prayer` in playlist mode is plain text → apply `renderWithVerseLinks`

7. **Board.tsx (line 114)** — `card.extended_prayer` when expanded is plain text → apply `renderWithVerseLinks`

---

### The curved arrow + intro copy on Lord's Prayer section (Index.tsx):

After the Lord's Prayer lines, add:
- A `<VerseLink reference="Matthew 6:9-13" text="The Lord's Prayer">` badge
- A curved SVG arrow drawn with a `stroke-dashoffset` animation (CSS `@keyframes`) that triggers once via `useInView` / `whileInView` when the user scrolls to this section and lingers
- Small copy underneath: *"Hover any scripture badge for an instant AI summary"*

The arrow draws from above-right, curving down to point at the VerseLink badge. It uses an SVG `<path>` with a `stroke-dasharray` / `stroke-dashoffset` draw animation triggered by Framer Motion's `whileInView`.

```
        ╭──── curved arrow ────╮
        │  (draws itself in)   ↓
        │              [Matthew 6:9–13]
        │
    "Hover any scripture badge for an instant AI summary"
```

The arrow only shows on first load (localStorage flag `verselink_intro_seen`) so returning users don't see it every time.

---

## Files to change

| File | Change |
|---|---|
| `src/pages/Blog.tsx` | Import `VerseLink`, replace plain `Psalm 119:105` text |
| `src/pages/BlogPost.tsx` | Import `VerseLink`, replace plain `Psalm 119:105` text |
| `src/pages/Auth.tsx` | Import `VerseLink`, replace plain `Matthew 6:6` attribution |
| `src/pages/Index.tsx` | Add `<VerseLink>` for Lord's Prayer + curved arrow intro component |
| `src/pages/Prayer.tsx` | Import `renderWithVerseLinks` logic, apply to `extended_prayer` blockquote |
| `src/pages/WarRoom.tsx` | Apply `renderWithVerseLinks` to `extended_prayer` in playlist display |
| `src/pages/Board.tsx` | Apply `renderWithVerseLinks` to expanded `extended_prayer` |

### The `renderWithVerseLinks` function
This currently lives inside `Prayers.tsx`. To avoid duplication across Prayer.tsx, WarRoom.tsx, and Board.tsx, extract it to a shared utility: `src/lib/renderWithVerseLinks.tsx`.

---

## Arrow animation details

```tsx
// Framer Motion whileInView triggers the SVG draw
<motion.path
  d="M 120,0 C 100,40 60,60 10,80"   // curved path pointing to badge
  stroke="hsl(42 85% 46%)"
  strokeWidth="2"
  fill="none"
  strokeDasharray="200"
  initial={{ strokeDashoffset: 200 }}
  whileInView={{ strokeDashoffset: 0 }}
  transition={{ duration: 1.2, ease: "easeOut", delay: 1.5 }}
  viewport={{ once: true }}
/>
```

The delay of `1.5s` means the arrow only starts drawing after the user has had a moment to read the prayer — approximating "when the user stops to read." The arrowhead is a small triangle at the path's end.

The intro copy and arrow are wrapped in a motion div that also fades in. A `localStorage` flag hides them for returning visitors.
