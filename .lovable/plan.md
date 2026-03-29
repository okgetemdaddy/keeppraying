

## Remove All Flyer Buttons and Associated Code

### Overview
Remove all flyer-related UI (buttons, dialogs, state) from Family Rooms, Circles, and the Pray the World page. The Invite button already covers sharing needs.

### Changes

**1. `src/pages/FamilyRoomDetail.tsx`**
- Remove `flyerOpen` state (line 70-71)
- Remove Flyer button (lines 262-266)
- Remove Flyer dialog (lines 560-577)
- Remove `FileText` from imports if no longer used

**2. `src/pages/CircleDetail.tsx`**
- Remove `flyerOpen` state (lines 74-75)
- Remove Flyer button (lines 266-270)
- Remove Flyer dialog (lines 704-732)
- Remove `FileText` from imports if no longer used

**3. `src/pages/PrayTheWorld.tsx`**
- Remove the "Flyers" tab from the tab list (line 21)
- Remove the `PrintableFlyers` import (line 8)
- Remove the flyers tab content block (lines 99-103)
- Remove `FileText` from imports
- Update the `Tab` type to remove `"flyers"` (line 11)

**4. `src/components/map/PrintableFlyers.tsx`**
- Delete this file entirely — it is only used by the Flyers tab in PrayTheWorld

**5. `src/App.tsx`**
- Update the feature description on line 106: change "create shareable flyers" to something like "track engagement, and share invite links"

