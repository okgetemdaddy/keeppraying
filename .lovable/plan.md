
## Problem Analysis

The current approach uses `line-clamp-4` (line 179) on the prayer text `<p>` element. This has a few issues:
- **Hard cutoff**: CSS `line-clamp` cuts text mid-sentence with an ellipsis (`...`), which looks abrupt and unprofessional, especially for sacred prayer text
- **Uniform 4 lines for all styles**: Different `text_style` values have different font sizes/line heights (e.g., `text-sm`, `text-lg`, `font-semibold`), so 4 lines means very different amounts of text
- **No expand option**: There's already a "Show scripture" accordion for `extended_prayer`, but the main prayer body has no way to read more without leaving the card
- **No visual fade**: The hard `...` ellipsis feels mechanical for spiritual content

## Better Approach: Soft Fade Gradient Truncation + Inline Expand

Instead of `line-clamp-4` with a hard ellipsis, use a **fixed max-height + bottom fade gradient + "Read more" toggle** directly on the card:

1. **Fixed pixel height** (`max-h-[112px]` ≈ 5-6 lines of body text) with `overflow-hidden`
2. **Fade-out gradient overlay** at the bottom of the text area (absolute-positioned gradient from transparent → card background color), which gracefully signals there's more text
3. **"Read more / Read less" toggle button** below — clicking it animates the container height open (Framer Motion `height: "auto"`) and removes the fade
4. **Smart detection**: Only show the fade + toggle if the text is actually long enough to overflow (measure via a `useRef` + `useEffect` checking `scrollHeight > clientHeight`)

## Changes Required

**Only `src/pages/Prayers.tsx`** — specifically the `PrayerCardItem` component:

1. Add `textRef` and `isTruncated` state to detect overflow
2. Replace `line-clamp-4` with a relative container + `max-h` + overflow-hidden + absolute gradient fade
3. Add `textExpanded` state toggled by a "Read more" button
4. Animate the text container height with Framer Motion (`animate={{ height: textExpanded ? "auto" : 112 }}`)
5. Show/hide the gradient based on `!textExpanded && isTruncated`
6. Style the "Read more" link in the gold palette, small, sits below the fade

## Visual Result

```text
┌─────────────────────────────┐
│ Card Title           [badge]│
│                             │
│ Father, I come before You   │
│ with faith, believing Your  │
│ promise — that everyone     │
│ who asks receives, everyone │
│ who seeks finds, and...     │   ← gradient fade here
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ Read more →                 │   ← gold text, small
│                             │
│ #faith #promise  ♡ 512 🙏  │
└─────────────────────────────┘
```

When "Read more" is clicked, the gradient fades out and the full text expands smoothly.

## Implementation Detail

```tsx
const textRef = useRef<HTMLParagraphElement>(null);
const [isTruncated, setIsTruncated] = useState(false);
const [textExpanded, setTextExpanded] = useState(false);

useEffect(() => {
  const el = textRef.current;
  if (el) setIsTruncated(el.scrollHeight > el.clientHeight);
}, [card.prayer_text]);

// Render:
<div className="relative">
  <motion.div
    animate={{ height: textExpanded ? "auto" : 112 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="overflow-hidden"
    style={{ minHeight: 0 }}
  >
    <p ref={textRef} className={`${textClass} leading-relaxed`}>
      {card.prayer_text}
    </p>
  </motion.div>
  {/* Gradient fade */}
  {!textExpanded && isTruncated && (
    <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
      style={{ background: "linear-gradient(to bottom, transparent, hsl(38 60% 99%))" }} />
  )}
</div>
{isTruncated && (
  <button onClick={() => setTextExpanded(v => !v)}
    className="text-xs font-medium" style={{ color: "hsl(42 75% 40%)" }}>
    {textExpanded ? "Read less ↑" : "Read more →"}
  </button>
)}
```

The gradient color matches the card background (`hsl(38 60% 99%)`), making it look like the text naturally dissolves rather than cutting off. This is a much more premium, faith-appropriate approach.
