

# Plan: Fix Domain References + Implement Backend Gaps

## Part A — Domain Fix (Quick)

Only **one file** has the wrong domain:

1. **`src/components/map/PrintableFlyers.tsx`** line 114: `"keeppraying.lovable.app"` → `"keeppray.ing"`

Additionally, fix the typo in **`supabase/functions/moderate-testimony/index.ts`** line 29: `"KeepPraying.ing"` → `"KeepPray.ing"` (brand name consistency).

All other files (`index.html`, edge functions, pages) already correctly use `KeepPray.ing` or `keeppray.ing`.

---

## Part B — Backend Gap Fixes (6 items from the approved audit)

### 1. Region selector in AddPrayerModal
- Add a dropdown with the 12 regions from `REGION_COORDS` to `AddPrayerModal.tsx`
- Pass selected region when inserting into `prayer_cards`
- Also add region to VoiceRecorder save flow and SermonSync save flow

### 2. Real QR codes on Printable Flyers
- Install `qrcode` npm package
- Replace the fake random-grid QR with a real scannable QR code pointing to `https://keeppray.ing`
- Render QR to a temporary canvas/image, then draw it onto the flyer canvas

### 3. TTS Audio Caching
- **Migration**: Add `audio_url text` column to `prayer_cards`
- **Storage**: Create `prayer-audio` bucket (public read)
- **Logic**: In the TTS playback flow, check `audio_url` first → if cached, play directly. If not, call `prayer-tts`, upload result to storage, save URL to `audio_url`, then play
- **Invalidation**: When a prayer card is edited, set `audio_url = NULL` so next play regenerates

### 4. Local Radar uses geolocation
- Map user's lat/lng to the nearest region from `REGION_COORDS`
- Filter/weight radar data to show that region's activity prominently
- Show "Your area" label on the radar

### 5. Sermon Sync — fetch real transcript
- Update `sermon-sync` edge function to attempt fetching YouTube auto-captions via the public `timedtext` endpoint
- If captions available, feed actual transcript text to AI instead of just the title
- Fallback to title-based generation if captions unavailable

### 6. Voice Recorder offline retry
- Add `window.addEventListener("online", processOfflineQueue)` in the useEffect
- Convert `forEach(async ...)` to sequential `for...of` loop with per-item error handling

---

## Technical Details

**Files to modify:**
- `src/components/map/PrintableFlyers.tsx` — domain fix + real QR code
- `src/components/AddPrayerModal.tsx` — region dropdown
- `src/components/VoiceRecorder.tsx` — region on save + offline retry listener
- `src/pages/SermonSync.tsx` — region on save
- `src/components/map/LocalRadar.tsx` — use geolocation for region filtering
- `supabase/functions/sermon-sync/index.ts` — fetch YouTube captions
- `supabase/functions/moderate-testimony/index.ts` — brand name typo fix
- Prayer TTS playback component (need to locate exact file) — caching logic
- New migration: `audio_url` column + storage bucket

**New dependency:** `qrcode` (for real QR generation on flyer canvas)

