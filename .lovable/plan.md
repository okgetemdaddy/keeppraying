

## Plan: Restructure PrayerAssist.ing FAB Item

**Current behavior:** The "PrayerAssist.ing" FAB item calls `onAskTeam()` which opens a prayer request modal.

**Goal:** 
1. Change "PrayerAssist.ing" to navigate to `/assistant`
2. Add a new FAB item "Ask KeepPray.ing for a Prayer" that keeps the current `onAskTeam()` behavior

### Changes in `src/components/PrayerFAB.tsx`

1. **Update the "team" item** — change label to "PrayerAssist.ing", change onClick to `go("/assistant")`, keep sparkles icon and gold color.

2. **Add new item** — "Ask KeepPray.ing for a Prayer" using `HandHeart` icon (already imported), calling `authGuard(() => { onAskTeam(); setOpen(false); })`, placed right after the community item. Use a warm complementary color.

**Final FAB order:**
1. Ask Community to Pray
2. Ask KeepPray.ing for a Prayer *(new — takes over old onAskTeam behavior)*
3. PrayerAssist.ing *(now navigates to /assistant)*
4. We Pray
5. ...rest unchanged

