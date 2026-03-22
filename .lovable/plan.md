
## What's missing on the PrayerAssist.ing page

Looking at the screenshot and the code, here is exactly what's missing:

**1. "Matthew 7:7" at the bottom is plain text — not a VerseLink**

Line 195:
```tsx
<p className="verse-text text-sm">"Ask and it will be given to you…" — Matthew 7:7</p>
```
The reference `Matthew 7:7` is hardcoded as a plain string. It should be a `<VerseLink reference="Matthew 7:7" />` component so users get the interactive hover tooltip with the full verse text — exactly the same as the system already does on the Prayers page.

**2. The suggestion cards show "Explain how to pray for someone else (intercession)" — but the label in the screenshot says "Explain how to pray for someone else (intercession)". The suggestion text in code (line 85) reads:**
```
"Explain how to pray for someone else (intercession)"
```
This matches, so that's fine.

**3. Global auto-detection of verse references is missing from the welcome/empty screen**

The `renderWithVerseLinks` utility exists in `src/lib/renderWithVerseLinks.tsx` and is used on the Prayers page. On the PrayerAssist welcome screen, the subtitle text and the footer verse quote are rendered as plain strings — none of the scripture references auto-link.

The quote at the bottom (`"Ask and it will be given to you…" — Matthew 7:7`) needs the `Matthew 7:7` portion wrapped in a `<VerseLink>`.

---

### The fix — one file, two changes in `src/pages/PrayerAssist.tsx`

**Change 1** — Line 195: Replace the static verse citation with a `<VerseLink>`:
```tsx
// Before
<p className="verse-text text-sm">"Ask and it will be given to you…" — Matthew 7:7</p>

// After
<p className="verse-text text-sm">
  "Ask and it will be given to you…" — <VerseLink reference="Matthew 7:7" />
</p>
```

That's the only missing piece visible in the screenshot — the `VerseLink` is already imported (line 11), so no new imports needed. This is a single-line targeted fix.
