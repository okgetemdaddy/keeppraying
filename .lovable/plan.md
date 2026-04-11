

## Fix Build Error + Acknowledge Reference Files

### Build Error Fix

**File: `supabase/functions/create-donation/index.ts`** — line 3

Change the import from:
```ts
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
```
to:
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

This aligns with how every other edge function in the project imports Supabase.

### Reference Files Acknowledged

The three uploaded files (`PrayerCardAsset.tsx`, `TestimonyCanvasAsset.tsx`, `CLAUDE_HANDOFF.md`) are now fully read and understood. They serve as the design blueprint for the production prayer card system. Key takeaways absorbed:

- Dual-mode theme system (dark/light × 3 backgrounds each) with ~20 color properties
- 12 Google Fonts with live preview picker
- Bottom bar icon layout and all drawer specifications
- Complete `@LOVABLE` dev notes inventory for backend wiring
- TestimonyCanvasAsset with type/speak/write compose modes and handwriting canvas
- Naming conventions: "Prayer Assist" not "AI", "KeepRead.ing" for Bible companion, "verselinks" for verse references

These will guide all future prayer card and board implementation work.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/create-donation/index.ts` | Fix import to use `esm.sh` instead of `npm:` prefix |

