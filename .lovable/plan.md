

# Add "KINGDOM PRAYERS" subtitle to KeepPray.ing hero on `/`

## Change

**File: `src/pages/Index.tsx`** — After the closing `</motion.h1>` tag (line 449), insert a new `motion.p` element before the verse quote:

```tsx
<motion.p
  variants={fadeUp}
  className="mt-1 text-[10px] font-semibold tracking-[0.35em] uppercase"
  style={{ color: "hsl(42 85% 56% / 0.7)" }}
>
  Kingdom Prayers
</motion.p>
```

This places the wide-tracked, gold-tinted subtitle directly below "KeepPray.ing" and above the Philippians 4:6 verse, matching the established brand pattern from the Prayer Station hero.

## Files

| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Insert 1 element at line 450 |

