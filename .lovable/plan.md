

# Bible Pocket Dark Mode Contrast Refactor

## What Gets Built

A strict visual overhaul of the Bible Pocket drawer and its child components (segmented control, stats strip, annotation cards, empty states, and the HowToGuide tab) to enforce high-contrast dark mode readability. No logic, animation, or state changes — purely class/style replacements.

## Changes

### 1. `BiblePocketSheet.tsx` — Drawer surface and all internal elements

| Element | Current | New |
|---------|---------|-----|
| Drawer background | `bg-card/98 backdrop-blur-xl` | `bg-[#1C1C1E] border-l border-neutral-800` |
| Header border | `border-border/50` | `border-neutral-800` |
| Title text | `text-foreground` | `text-neutral-100` |
| Title icon | `text-primary` | `text-amber-400` |
| Chapter subtitle | `text-muted-foreground` | `text-neutral-400` |
| Segmented control track | `bg-muted/50` | `bg-neutral-800/60` |
| Active tab pill | `bg-background shadow-sm text-foreground` | `bg-neutral-700 text-white shadow-sm` |
| Inactive tab text | `text-muted-foreground` | `text-neutral-400` |
| Badge | `bg-primary text-primary-foreground` | `bg-amber-400 text-neutral-900` |
| Stats strip background | `bg-muted/20`, `border-border/30` | `bg-neutral-800/30`, `border-neutral-800` |
| Stats text | `text-muted-foreground` | `text-neutral-400` |
| Empty state icon | `text-muted-foreground/25` | `text-neutral-600` |
| Empty state heading | `text-muted-foreground` | `text-neutral-100` |
| Empty state subtext | `text-muted-foreground/60` | `text-neutral-500` |
| Ink summary card | `border-border/50 bg-muted/20` | `border-neutral-700 bg-neutral-800/40` |
| Ink summary title | `text-foreground` | `text-neutral-100` |
| Ink summary icon | `text-primary` | `text-amber-400` |
| Ink summary subtext | `text-muted-foreground` | `text-neutral-400` |
| Annotation card | `border-border/40 bg-background/60` | `border-neutral-700 bg-neutral-800/50` |
| Annotation note icon | `text-amber-500` | `text-amber-400` |
| Annotation pen icon | `text-primary/60` | `text-amber-400/60` |
| Timestamp text | `text-muted-foreground` | `text-neutral-500` |
| Annotation body text | `text-foreground/80` | `text-neutral-200` |
| Verse tag pill | `bg-primary/10 text-primary` | `bg-amber-400/10 text-amber-400` |

### 2. `HowToGuide.tsx` — Guide tab internals

| Element | Current | New |
|---------|---------|-----|
| Search input | `bg-muted/50 border-border/40` | `bg-neutral-800/60 border-neutral-700` |
| Search icon | `text-muted-foreground` | `text-neutral-500` |
| Active category pill | `bg-primary text-primary-foreground` | `bg-amber-400 text-neutral-900` |
| Inactive category pill | `bg-muted/60 text-muted-foreground` | `bg-neutral-800/60 text-neutral-400` |
| Card default background | `bg-background/60` border `border-border/40` | `bg-neutral-800/50` border `border-neutral-700` |
| Card expanded background | `bg-primary/5 border-primary/20` | `bg-amber-400/5 border-amber-400/20` |
| Card icon box default | `bg-muted/50 text-muted-foreground` | `bg-neutral-700/60 text-neutral-400` |
| Card icon box expanded | `bg-primary/15 text-primary` | `bg-amber-400/15 text-amber-400` |
| Card title | `text-foreground` | `text-neutral-100` |
| Card summary | `text-muted-foreground` | `text-neutral-400` |
| Step number circle | `bg-primary/10 text-primary` | `bg-amber-400/10 text-amber-400` |
| Step text | `text-foreground/80` | `text-neutral-200` |
| Chevron | `text-muted-foreground/50` | `text-neutral-600` |

## Constraints Honored

- Zero changes to animation, state machine, or props
- All replacements are Tailwind class swaps only

## Files Changed

| File | Change |
|------|--------|
| `src/components/bible/BiblePocketSheet.tsx` | Replace all color classes per the table above |
| `src/components/bible/HowToGuide.tsx` | Replace all color classes per the table above |

