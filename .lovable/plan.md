

## Fix Sermon Sync Transcript Extraction + Remove Dead Code

### Problem
All transcript tiers are failing:
- **Tier 1** (direct timedtext): Returns empty/non-JSON responses
- **Tier 2** (watch page scrape): `CONSENT=PENDING+999` cookie triggers YouTube's consent gate → `LOGIN_REQUIRED`
- **Tier 2b** (Innertube WEB): Also `LOGIN_REQUIRED` — WEB client now requires cookies
- **Tier 3** (Zyla): Returns 401, and user wants it removed entirely

### Plan — Single file: `supabase/functions/sermon-sync/index.ts`

**1. Fix the watch page scrape (Tier 2) — this is the primary fix**
- Remove `CONSENT=PENDING+999` cookie (line 140) — this is what triggers YouTube's consent wall and blocks caption access
- Add proper `Sec-Fetch-*` headers to mimic a real browser navigation
- Keep the existing brace-counting JSON parser (robust for nested JSON)

**2. Add ANDROID Innertube client as new Tier 2b**
- Replace the WEB client (`LOGIN_REQUIRED`) with `clientName: "ANDROID"`, `clientVersion: "19.09.37"`, `androidSdkVersion: 30`
- Android client doesn't require cookies/login — historically the most permissive for server-side use

**3. Remove all Zyla code (Tier 3) — lines 269-304**
- User explicitly wants Zyla removed
- The `ZYLA_API_KEY` secret can remain unused

**4. Remove dead code**
- Remove the old AssemblyAI word-format conversion logic (lines 573-580) — there's no AssemblyAI anymore, any old cached data has either been converted or is stale
- Clean up the legacy `CONSENT` cookie reference

**5. Keep everything else unchanged**
- Legacy URL-based fallback (lines 428-476) remains as the ultimate safety net
- All prompts, caching, Grok/Gemini pipeline untouched
- Frontend (`SermonSync.tsx`) unchanged — no API contract changes

### Why this will work
- Removing the CONSENT cookie is the single most impactful fix — logs show the watch page loads fine (1MB HTML) but the player response is gate-blocked
- Android Innertube is YouTube's most permissive client for server-side use
- No new dependencies or secrets needed

### Technical details
- The `getYouTubeTranscript` function shrinks from 4 tiers to 3 (Tier 1 direct → Tier 2 watch page → Tier 2b Android Innertube)
- Tier 2 watch page headers change to include `Sec-Fetch-Dest: document`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Site: none`
- Error message updated to remove Zyla reference
- Future iOS/Android app readiness unaffected — the edge function is backend-only, frontend calls via `supabase.functions.invoke()`

