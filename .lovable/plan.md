
## Phase: Move Sayings into Logo Area

### Concept
Instead of a floating overlay at the bottom, the "KeepPray.ing" logo in the nav bar will periodically transform into a saying. The logo text fades/morphs out and the saying fades in (same position, same styling weight), holds for ~6 seconds, then gracefully transitions back to the logo. This creates a delightful "the app is whispering to you" effect.

### Animation Design
- Logo text ("KeepPray.ing") cross-fades with a saying using `AnimatePresence` with `mode="wait"`
- Logo exit: gentle scale-down + fade-out + slight upward drift
- Saying enter: fade-in from below with a soft golden sparkle/glow pulse
- Saying text styled in italic with a subtle ✨ prefix, slightly smaller, warm gold tint
- After 6s the saying exits the same way and the logo fades back in
- Spring easing for organic, peaceful feel

### Changes

**1. `src/components/ScriptureEasterEgg.tsx` — Convert to a hook**
- Export a custom hook `useSayingsCycle()` that returns `{ currentSaying: string | null }`
- Keep the Supabase fetch + interval logic, remove the rendered overlay entirely
- The component file becomes `src/hooks/useSayingsCycle.ts`

**2. `src/components/SiteNav.tsx` — Integrate sayings into logo**
- Import `useSayingsCycle`
- In the logo `<Link>`, wrap the logo text and saying in `AnimatePresence mode="wait"`
- When `currentSaying` is null: show logo with a motion key
- When `currentSaying` is set: show the saying text with a different motion key
- Both use cross-fade + subtle vertical slide animations
- The link still navigates to `/` on click regardless of which text is showing

**3. `src/App.tsx` — Remove standalone `<ScriptureEasterEgg />`**
- Delete the import and usage since sayings now live in the nav logo

### Technical Details
- Hook extracts all state/effect logic from current `ScriptureEasterEgg.tsx`
- `ScriptureEasterEgg.tsx` file will be deleted; new file `src/hooks/useSayingsCycle.ts` created
- No database changes needed
- No new dependencies
