

## Reset PrayerCard to Match PrayerCardAsset Design Lab — Exactly

### Problem
The current `PrayerCard.tsx` (836 lines) diverges significantly from the design truth in `PrayerCardAsset.tsx` (1073 lines). It merged old BoardCard logic (labels, inline notes, background images, truncation, desktop dropdown menus) that contradicts the design lab's vision. The user wants an exact reset: every card should look and behave identically to the design lab, with real data wired in.

### What Changes

**Rewrite `src/components/board/PrayerCard.tsx`** — completely, using `PrayerCardAsset.tsx` as the template. The structure will be:

1. **Same outer shell**: `aspect-[9/16]`, `max-w-[420px]`, `perspective: 1200px`, breathing animation, ambient glow pulse
2. **Same front face**: KEEPPRAY.ING brand tag, Playfair Display title, scrollable prayer text, dust particles, inner glow, lamp light
3. **Same Scripture & Meditation collapsible strip**: with individual verse badges (verselinks) + full text — pulling from `prayer.extended_prayer` and any `prayer_verses` data
4. **Same bottom bar**: Privacy dot → Prayed → Comments → Pin → Share → Listen → Testify → More (••• )
5. **Same 3-dot menu drawer** (all 8 items in the 2x2 grid): Go to Prayer Circle, Save to Prayer Room, Enrich with Scripture, Private Share, Journal Entry, Add Photos, Change Theme, Change Font
6. **All 8 themed drawers** copied exactly from PrayerCardAsset: Comments, Options/More, Font Picker, Theme Picker, Privacy, Share, Journal Entry, Add Photos, Enrich with Scripture
7. **Same back face**: TestimonyCanvasAsset / TestimonyCardFace / TestifyBack (this part already works)
8. **Same 3D flip** with spring physics

**What gets removed from the current PrayerCard.tsx:**
- Labels/tags display (user said delete all tags)
- Inline notes editing section (notes have new locations per user)
- `card_color` / `overlay_opacity` / background image layer overrides
- `PRAYER_CHAR_LIMIT` truncation (design lab scrolls, doesn't truncate)
- `FormattedText` component (design lab uses plain `<p>`)
- Desktop `DropdownMenu` for more menu (design lab uses Drawer for all; we keep responsive pattern — Drawer on mobile, DropdownMenu on desktop — but the DropdownMenu gets ALL 8 items, not just 3)
- `LABEL_PALETTE` and all label rendering code

**What gets wired to real data (the only additions beyond PrayerCardAsset):**
- `prayer.prayer_text` replaces hardcoded demo text
- `prayer.title` replaces "A Prayer for Provision"
- `prayer.extended_prayer` + verse data replaces `MOCK_SCRIPTURES`
- `prayer.text_style` drives font selection (persisted)
- `prayer.status` drives privacy dot state
- `prayer.voice_audio_url` → VoiceWaveformPlayer (keep, exists in design lab vision)
- Real Supabase mutations for: prayed, pin, delete, share, notes
- TTS player hook (keep — Listen button is in design lab)
- Testimony check on mount (keep — Testify button is in design lab)

**What gets wired for responsive desktop:**
- The ••• menu: Drawer on mobile (matching design lab exactly), DropdownMenu on desktop with all 8 items
- This is the ONLY responsive divergence from design lab

### Card Sizing
All cards will be fixed `aspect-[9/16]` with `max-w-[420px]` — identical sizing, no resize options. On mobile they fill width. On desktop they sit in the 2-col grid at their natural max-width.

### BoardV2 Updates
- Remove tag/label rendering from the grid (tags are gone)
- Cards render at fixed aspect ratio — no variable heights

### Files Changed

| File | Action |
|------|--------|
| `src/components/board/PrayerCard.tsx` | **REWRITE** — reset to PrayerCardAsset structure with real data wiring |
| `src/pages/BoardV2.tsx` | **MINOR UPDATE** — remove label-related code if any |

### What Is NOT Changing
- `PrayerCardAsset.tsx` — untouched (design sandbox)
- `prayerCardTheme.tsx` — untouched
- `DustParticles.tsx` — untouched
- `BarBtn.tsx` — untouched (but PrayerCard will use inline BarBtn like PrayerCardAsset does, not the extracted component, to match exactly)
- `TestimonyCanvasAsset.tsx`, `TestifyBack.tsx`, `TestimonyCardFace.tsx` — untouched
- Board.tsx / BoardCard.tsx — untouched (legacy)

