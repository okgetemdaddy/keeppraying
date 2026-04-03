

# Native iPadOS App Waitlist Signup

## What this does
Adds a vertical waitlist banner to the left of the Bible reading column and a matching email input at the bottom of the Bible Sleeve. Clicking the banner opens a drawer with feature highlights, an email input, and a thank-you blessing on submission.

## Technical changes

### 1. Database migration: `waitlist_signups` table

```sql
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  platform text NOT NULL DEFAULT 'ipados',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, platform)
);
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert waitlist" ON public.waitlist_signups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users see own signups" ON public.waitlist_signups FOR SELECT TO authenticated USING (auth.uid() = user_id);
```

### 2. New component: `src/components/bible/iPadWaitlistBanner.tsx`

- A vertically-oriented pill/tab fixed to the left edge of the `max-w-3xl` reading column
- Text reads "iPad App" rotated 90° with a small Apple icon or tablet icon
- Subtle warm gold accent border, gentle pulse animation
- `onClick` opens the waitlist drawer
- Dismissible: once user signs up or clicks X, store `ipad_waitlist_dismissed` in localStorage and hide

### 3. New component: `src/components/bible/iPadWaitlistDrawer.tsx`

- Uses `ResponsiveSheet` (Drawer on touch, Sheet on desktop)
- **Content sections:**
  - Header: "The Native iPadOS Experience is Coming" with tablet illustration/icon
  - Feature bullets (4-5): Apple Pencil pressure sensitivity, offline chapters, Split View support, Siri shortcuts for prayer, native haptics
  - Each bullet has an icon + short description
- **Email signup form:**
  - `Input` component for email with validation
  - Arrow submit button (amber-500 accent)
  - On submit: insert into `waitlist_signups`, show thank-you state
- **Thank you state:**
  - Replaces form with a blessing message: "God bless your study journey. We'll notify you when the iPad app is ready. 🕊️"
  - Auto-closes after 3 seconds or tap to dismiss
- **X close button** in top-right corner
- Premium styling: cream/paper background, warm gold accents, EB Garamond headings

### 4. Wire into `BibleReader.tsx`

- Add `waitlistDrawerOpen` state
- Render `iPadWaitlistBanner` positioned to the left of the reading area (using `relative` wrapper on the `max-w-3xl` container + `absolute -left-14` positioning for the banner)
- Only show on desktop/iPad viewports (not phone — use `useDeviceDetect`)
- Render `iPadWaitlistDrawer`

### 5. Add email input to `BibleSleeveSheet.tsx`

- After the Trash Bin section (bottom of the sleeve), add a compact waitlist signup section
- Small label: "Native iPad App — Coming Soon"
- Same email `Input` + arrow button pattern
- Same `waitlist_signups` insert logic
- Same thank-you/blessing state
- No collapsible wrapper — always visible at the bottom

## Files changed

| File | Change |
|------|--------|
| `src/components/bible/iPadWaitlistBanner.tsx` | New — vertical left-edge pill trigger |
| `src/components/bible/iPadWaitlistDrawer.tsx` | New — feature highlights + email signup drawer |
| `src/components/bible/BibleReader.tsx` | Add waitlist state, render banner + drawer |
| `src/components/bible/BibleSleeveSheet.tsx` | Add waitlist email input at bottom |
| Migration | `waitlist_signups` table |

