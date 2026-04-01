

# Mobile "Write a Prayer" — Full-Screen Composer Redesign

## What Changes

Redesign the mobile "Write It" flow into a **three-phase experience** using a bottom-slide-up Drawer:

### Phase 1: Initial Drawer (slide up from bottom)
- Clean drawer with title "Write a Prayer" and a tappable text input placeholder
- Tapping the text area transitions to Phase 2

### Phase 2: Full-Screen Composer
- Textarea expands to fill the entire screen (fixed fullscreen overlay)
- A **slim formatting toolbar** sits just above the textarea with: **Bold**, **Italic**, **Underline**, **Strikethrough** toggle buttons
- Below the textarea: a slim, easily tappable **"Submit Prayer"** button (full-width, gold gradient)
- No title field, no text style pills, no accordions — just the writing space and formatting bar
- User types their prayer, applies inline formatting, taps Submit

### Phase 3: Thank You Confirmation (back to drawer)
- After successful submission, the fullscreen closes and the drawer shows a warm confirmation:
  - *"Thank you — God bless you. He hears every prayer."*
  - *"Consider making it public to edify others. We are praying for you!"*
- Tap anywhere or swipe down to dismiss

### Desktop Behavior
- Desktop keeps the current modal UI unchanged — this redesign is **mobile-only** (detected via `useIsMobile()`)

## Technical Approach

### File: `src/components/AddPrayerModal.tsx`
- Add `useIsMobile()` hook check
- When mobile: render a completely different component (`MobileWritePrayerDrawer`) instead of the current dialog
- When desktop: keep existing modal as-is

### New File: `src/components/MobileWritePrayerDrawer.tsx`
- Uses the `Drawer` component from vaul (same pattern as `ResponsiveDialog`)
- Internal state machine: `idle` → `composing` → `submitted`
- **idle**: Drawer with placeholder text area that on focus transitions to `composing`
- **composing**: Fixed fullscreen overlay with:
  - Formatting toolbar (Bold/Italic/Underline/Strikethrough as icon toggle buttons)
  - Uses `document.execCommand` or tracked markdown state for inline formatting
  - Full-height contentEditable div or textarea
  - Slim "Submit Prayer" button pinned at bottom
- **submitted**: Back to drawer view with thank-you message, dismiss on tap/swipe
- Submission logic reuses the same Supabase insert from `AddPrayerModal`

### Formatting Implementation
- Use a `contentEditable` div for rich text, or simpler approach: track bold/italic/underline/strikethrough as toggles that wrap selected text with markers, then store as the `text_style` or apply inline HTML
- Simplest reliable approach: `contentEditable` div with `document.execCommand('bold')` etc., extract innerHTML for storage

### No Database Changes
- Prayer text stored in existing `prayer_text` column
- Rich formatting stored as simple HTML in the same field (already supports string content)

