

## Fix: Glimmer Visible During Pause

### Problem
The `times` array `[0, 3/43, 3/43]` has duplicate values — framer-motion needs distinct keyframe positions to properly hold opacity at 0. The gradient tail also remains partially visible at `-200%`.

### Fix

**`src/components/bible/BibleEdgeTabs.tsx` — lines 87-96**

Change the keyframes to use a 4-point sequence with a tiny epsilon gap so opacity snaps to 0 right after the sweep ends and stays there:

```ts
animate={{
  backgroundPosition: ["200% 0%", "-200% 0%", "-200% 0%", "200% 0%"],
  opacity: [1, 1, 0, 0],
}}
transition={{
  duration: 43,
  times: [0, 3 / 43, 3.01 / 43, 1],
  ease: "linear",
  repeat: Infinity,
}}
```

- 0 → 3s: sweep moves across (opacity 1)
- 3s → 3.01s: opacity snaps to 0 (instant)  
- 3.01s → 43s: invisible, position resets silently
- Cycle repeats

One-line-range edit, no other files affected.

