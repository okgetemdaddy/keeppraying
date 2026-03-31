

# Swipe-to-Dismiss for Mobile AND iPad — Responsive Wrappers

## Problem
All `Sheet` and `Dialog` components use Radix primitives that lack touch swipe-to-dismiss. The current `useIsMobile()` hook only covers phones (<768px), completely ignoring iPads (768–1024px). iPad users get the desktop experience but need touch-friendly swipe interactions too.

## Approach

### 1. Add `useIsTouch()` hook (`src/hooks/use-mobile.tsx`)
Add a new hook alongside the existing `useIsMobile`:
- `useIsTouch()` returns `true` for **both** mobile and iPad (< 1024px)
- This is the hook the responsive wrappers will use — any touch device gets swipe
- Keep `useIsMobile()` unchanged for layout decisions (tab bar, etc.)

### 2. Create `ResponsiveSheet` (`src/components/ui/responsive-sheet.tsx`)
- Uses `useIsTouch()`
- **Touch devices** (phone + iPad): renders as `Drawer` (vaul) — swipe-to-dismiss from bottom
- **Desktop**: renders as standard `Sheet` (side panel)
- Exports matching sub-components: `ResponsiveSheetContent`, `ResponsiveSheetHeader`, `ResponsiveSheetTitle`, `ResponsiveSheetDescription`, `ResponsiveSheetFooter`, `ResponsiveSheetClose`

### 3. Create `ResponsiveDialog` (`src/components/ui/responsive-dialog.tsx`)
- Uses `useIsTouch()`
- **Touch devices**: renders as `Drawer` — swipe-to-dismiss bottom sheet
- **Desktop**: renders as centered `Dialog`
- Exports matching sub-components

### 4. Migrate all Sheet consumers (11 files)
Replace `Sheet` imports with `ResponsiveSheet` in:

| File | Context |
|------|---------|
| `SiteSettingsSheet.tsx` | Board settings |
| `AIEnrichPanel.tsx` | AI enrichment |
| `BibleSleeveSheet.tsx` | Bible tools |
| `BibleSuggestionSheet.tsx` | Bible suggestion |
| `BibleFeaturesTour.tsx` | Bible tour |
| `FloatingToolbar.tsx` | Bible floating toolbar |
| `Prayer.tsx` | Testify sheet |
| `Board.tsx` | Various sheets |
| `Testify.tsx` | Testify sheets |
| `Prayers.tsx` | Prayer list sheets |
| `sidebar.tsx` | Sidebar (mobile) |

### 5. Migrate all Dialog consumers (21 files)
Replace `Dialog` imports with `ResponsiveDialog` in:

| File | Context |
|------|---------|
| `AddPrayerModal.tsx` | Add prayer form |
| `SharePrayerModal.tsx` | Share prayer |
| `InviteShareModal.tsx` | Invite/share |
| `CommunityPrayerRequestModal.tsx` | Community request |
| `TeamPrayerRequestModal.tsx` | Team request |
| `AddBreathPrayerModal.tsx` | Add breath prayer |
| `ThemeSanctuaryModal.tsx` | Theme picker |
| `PrayerPartnerCard.tsx` | Partner dialog |
| `BoardCard.tsx` | Duplicate/confirm dialogs |
| `PrayerViewerModal.tsx` | Prayer viewer |
| `TestimonyEnrichModal.tsx` | Testimony enrich |
| `VerseBunchDialog.tsx` | Verse bunch |
| `ClassicalPrayersLibrary.tsx` | Classical prayers |
| `BibleSearchDialog.tsx` | Bible search |
| `AccountabilityCircles.tsx` | Circle dialogs |
| `FamilyRooms.tsx` | Room dialogs |
| `FamilyRoomDetail.tsx` | Room detail dialogs |
| `Breathe.tsx` | Breathe page dialogs |
| `TestimonyDetail.tsx` | Testimony dialogs |
| `Board.tsx` | Board dialogs |
| `Testify.tsx` | Testify dialogs |

### Technical Detail

**`useIsTouch` implementation:**
```typescript
const TABLET_BREAKPOINT = 1024;
export function useIsTouch() {
  // returns true for < 1024px (phones + iPads)
}
```

**ResponsiveSheet pattern:**
```tsx
export function ResponsiveSheet({ children, ...props }) {
  const isTouch = useIsTouch();
  if (isTouch) return <Drawer {...props}>{children}</Drawer>;
  return <Sheet {...props}>{children}</Sheet>;
}
```

Each sub-component (Content, Header, Title, etc.) similarly switches between Drawer and Sheet variants.

### Files Summary

| File | Action |
|------|--------|
| `src/hooks/use-mobile.tsx` | Add `useIsTouch()` hook |
| `src/components/ui/responsive-sheet.tsx` | **New** — Sheet↔Drawer wrapper |
| `src/components/ui/responsive-dialog.tsx` | **New** — Dialog↔Drawer wrapper |
| 11 Sheet-consuming files | Update imports |
| ~21 Dialog-consuming files | Update imports |

