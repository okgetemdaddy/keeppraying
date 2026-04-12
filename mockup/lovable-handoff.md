# KeepPray.ing — Lovable Handoff Document

> **Purpose:** This document gives Lovable AI the full context to connect the existing Supabase backend to the overhauled frontend architecture designed in the interactive mockup (`mockup/index.html`). Every `@LOVABLE` dev note in the HTML maps to a specific backend integration described below.

---

## What Was Built

A single-file interactive mockup (`index.html`) that serves as the **design specification** for the complete KeepPray.ing overhaul. It contains:

- **8 interactive screens:** Board, Explore, Circles, Profile, Pray Now (creation sheet), Focus Mode, Shared Prayer Landing, Fullscreen Draw Canvas
- **2 board layouts:** Full cards (default) and Layered stack (condensed)
- **Light/dark theming** via CSS custom properties on `data-theme="light|dark"`
- **Hover dev notes** (`data-note` attributes) on every interactive element explaining the production backend wiring, Supabase tables, edge functions, and AI integrations
- **All notes prefixed `@LOVABLE`** are direct instructions for backend integration

---

## Existing Backend (Already Built)

### Supabase Project
- **Auth:** Supabase Auth (email/password + Lovable Cloud OAuth)
- **Database:** PostgreSQL with existing tables (see `src/integrations/supabase/types.ts`)
- **Realtime:** Supabase Realtime for live comments, circle activity
- **Storage:** Buckets for prayer audio, prayer photos, prayer backgrounds
- **Edge Functions:** 37 deployed functions (see `supabase/functions/`)

### Key Existing Tables
| Table | Purpose |
|-------|---------|
| `prayer_cards` | Core prayer data (prayer_text, status, card_color, region, etc.) |
| `user_saved_prayers` | M:M join — user's board (position, is_pinned, is_favorite) |
| `testimonies` | Testimony entries linked to prayer_id |
| `accountability_circles` | Prayer circles / groups |
| `circle_members` | Circle membership |
| `prayer_shares` | 1:1 prayer sharing records |
| `prayer_share_comments` | Comments on shared prayers |
| `prayed_actions` | "I prayed this" tracking (count per user per prayer) |
| `user_activity_log` | Activity events (extend for PrayerWatch OS) |
| `profiles` | User profiles (streak, avatar, preferences) |

### Key Existing Edge Functions
| Function | Purpose |
|----------|---------|
| `enrich-prayer` | AI scripture matching, label generation, meditation essay |
| `prayer-assist` | SSE streaming AI prayer assistant |
| `prayer-tts` | Text-to-speech generation |
| `moderate-prayer` | AI content moderation before public publish |
| `daily-welcome` | Personalized daily greeting/verse |
| `ink-ocr` | OCR for drawn prayer canvas exports |
| `moderate-testimony` | AI moderation for testimonies |

---

## Screen-by-Screen Backend Integration

### 1. Board Screen (`screen-board`)

**Data flow:**
```
useQuery('user-prayers') → Supabase
  .from('user_saved_prayers')
  .select('*, prayer_cards(*)')
  .eq('user_id', currentUser.id)
  .is('prayer_cards.deleted_at', null)
  .order('position', { ascending: true })
```

**Features requiring backend:**
- **Daily verse:** Call `daily-welcome` edge function on mount. Uses PrayerWatch OS data for personalization. Falls back to curated verse array.
- **Streak:** Read `profiles.current_streak`, `profiles.longest_streak`. Updated by `prayed_actions` insert trigger.
- **Filter chips:** Append WHERE clauses — `Pinned` = `is_pinned=true`, `Shared` = prayer has `prayer_shares` rows, `Answered` = prayer has `testimonies` rows.
- **Layout toggle:** Save preference to `board_preferences.layout` (`'cards'|'layered'`). Create `board_preferences` table if not exists.
- **Focus Mode:** No separate data fetch — reuses the prayer already loaded. Full card rendered in a fixed overlay.

### 2. Prayer Card (Canonical Component)

**Variant system:**
| Variant | Used In | Actions Visible |
|---------|---------|-----------------|
| `full` | Board, Focus Mode | All: privacy, prayed, comments, pin, share, TTS, testify, more |
| `compact` | Explore feed, search results | prayed, comment count, share |
| `preview` | Popovers, link previews | None (read-only) |
| `shared` | Shared prayer landing | Listen, Save to Board, Pray Together |
| `embed` | Circle thread, PrayerAssist chat | Open full card link |

**Card actions → backend:**
- **Prayed button:** `INSERT INTO prayed_actions (prayer_id, user_id)`. Increment count. Contributes to streak.
- **Privacy toggle:** `UPDATE prayer_cards SET status = 'pending'` → triggers `moderate-prayer` edge function → on approval, `status = 'approved'`.
- **Comments:** Real-time via Supabase channel `prayer-comments:{prayer_id}`. Private comments: `is_private = true`, never exposed publicly.
- **Pin:** `UPDATE user_saved_prayers SET is_pinned = true`.
- **Share:** Creates `prayer_shares` record. If 2+ recipients → auto-create `accountability_circles`.
- **TTS:** Call `prayer-tts` edge function → cache audio URL in `prayer_cards.audio_url` → play with Howler.js.
- **Testify (flip):** `INSERT INTO testimonies (prayer_id, user_id, body)`. If prayer is public → `moderate-testimony` first. On first testimony → `answered_badge` appears.
- **Scripture enrichment:** `enrich-prayer` edge function (async after save). Populates `prayer_verses` join table.

### 3. Pray Now Sheet (`pray-sheet`)

**Three input modes:**
1. **Type:** `textarea` → `prayer_cards.prayer_text`
2. **Speak:** MediaRecorder audio → Supabase `prayer-audio` bucket. SpeechRecognition transcript → `prayer_cards.prayer_text`
3. **Draw:** Canvas export → `ink-ocr` edge function for text extraction → `prayer_cards.prayer_text`. Image → `prayer-backgrounds` bucket.

**Save flow:**
```
1. INSERT prayer_cards (status='private', prayer_text, created_by)
2. INSERT user_saved_prayers (prayer_id, user_id, position=0)
3. ASYNC: Call enrich-prayer edge function
   → Generates: title, scripture refs, labels, meditation_essay
   → Updates prayer_cards with enrichment data
4. Show post-save prompt: "Share with someone?"
5. Toast: "Prayer saved"
```

**PrayerAssist integration:**
- "Need help? Ask PrayerAssist" button in the sheet
- Opens a chat overlay powered by `prayer-assist` edge function (SSE streaming)
- AI crafts prayer based on user's prompt, using PrayerWatch OS context
- User can edit AI draft and save as their own prayer

### 4. Explore Screen (`screen-explore`)

**Rotating header:** Client-side array of sayings (`KeepPray.ing`, `Keep Believing`, `Keep Trusting`, etc.). Rotates every 5s. Could be personalized by PrayerWatch OS.

**Search:**
```
Hybrid search: Supabase full-text + pgvector cosine similarity
→ Call vector-search edge function
→ Query text embedded, matched against content_vectors
→ WHERE is_public = true AND deleted_at IS NULL
→ Results ranked by combined relevance score
```

**Filters:**
- `For You`: Semantic similarity to user's own prayer topics (PrayerWatch OS)
- `Trending`: ORDER BY prayed_count DESC, created_at range = 7 days
- `Answered`: INNER JOIN testimonies, display cards FLIPPED (testimony side)
- `Recent`: ORDER BY created_at DESC

**Prayer Request feature:**
- New table: `prayer_requests (id, body, submission_type, status, requester_id, assigned_warrior_id, created_at)`
- Text/voice/draw submissions accepted
- Sent to admin dashboard for triage
- Admin assigns to available Prayer Warriors
- Requester notified when warrior accepts

**Prayer Warriors Online:**
- Supabase Realtime Presence channel for users with `profiles.is_prayer_warrior = true`
- Status: `available | busy | offline`
- Green pulse = live
- Accept request → auto-create private 1:1 circle

### 5. Circles Screen (`screen-circles`)

**Data:**
```
SELECT ac.*, 
  (SELECT prayer_text FROM prayer_cards 
   WHERE id = (SELECT prayer_id FROM circle_prayers 
               WHERE circle_id = ac.id ORDER BY created_at DESC LIMIT 1))
FROM accountability_circles ac
JOIN circle_members cm ON cm.circle_id = ac.id
WHERE cm.user_id = currentUser.id
```

**Auto-creation:** When a prayer is shared to 2+ people, `INSERT INTO accountability_circles` + member records.

**Inside a circle:** Chronological feed of `PrayerCard(variant="full")` shared by members.

### 6. Profile Screen (`screen-profile`)

**New fields on `profiles` table:**
| Column | Type | Purpose |
|--------|------|---------|
| `ui_theme` | `text` | `'dark'` or `'light'` |
| `is_prayer_warrior` | `boolean` | Available for prayer toggle |
| `warrior_status` | `text` | `'available'|'busy'|'offline'` |
| `board_layout` | `text` | `'cards'|'layered'` |

**Theme toggle:** `UPDATE profiles SET ui_theme = 'light'` + localStorage for instant load.

**Prayer Warrior toggle:** `UPDATE profiles SET is_prayer_warrior = true, warrior_status = 'available'`. Joins Realtime Presence channel.

**Faith Journey:** PrayerWatch OS visualization — word cloud of prayer topics, timeline of answered prayers, scripture engagement frequency. All derived from `content_vectors` + `user_activity_log`.

**Prayer Archive:** `SELECT * FROM prayer_cards WHERE deleted_at IS NOT NULL AND deleted_by = user_id`. Hard delete from user view after 90 days.

### 7. Shared Prayer Landing (`shared-landing`)

**URL:** `/shared-prayer/:token`

**Flow:**
1. Token lookup → `prayer_shares` table → get `prayer_id`
2. Load prayer card (read-only)
3. If user not authenticated: show full prayer + signup CTA
4. If authenticated: "Save to Board" + auto-form circle with sender
5. TTS available without account (low-friction engagement)

### 8. Fullscreen Draw Canvas (`draw-fullscreen`)

**Tech:** `perfect-freehand` + `simplify-js` for pressure-sensitive strokes. Zustand store (`usePencilTools`) for tool state.

**Save:** Export canvas → `ink-ocr` edge function → text extraction → `prayer_cards.prayer_text` + image → storage bucket.

**iOS:** Capacitor Apple Pencil pressure + tilt via native plugin.

---

## New Tables Required

### `content_vectors`
```sql
CREATE TABLE content_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'prayer'|'testimony'|'journal'|'search'
  content_id uuid NOT NULL,
  embedding vector(1536),
  is_public boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON content_vectors USING ivfflat (embedding vector_cosine_ops);
```

### `prayer_requests`
```sql
CREATE TABLE prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text,
  submission_type text NOT NULL, -- 'text'|'voice'|'draw'
  audio_url text,
  image_url text,
  status text DEFAULT 'pending', -- 'pending'|'assigned'|'completed'
  requester_id uuid REFERENCES profiles(id),
  assigned_warrior_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### `deleted_prayers_bucket` (Admin-only)
```sql
CREATE TABLE deleted_prayers_bucket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_prayer_id uuid,
  prayer_text text,
  embedding vector(1536),
  deleted_by uuid REFERENCES profiles(id),
  deleted_at timestamptz DEFAULT now(),
  metadata jsonb -- original card_color, region, labels, etc.
);
-- Admin-only RLS: only service_role or admin users can SELECT
```

### `board_preferences`
```sql
CREATE TABLE board_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  layout text DEFAULT 'cards', -- 'cards'|'layered'
  atmosphere text DEFAULT 'default',
  updated_at timestamptz DEFAULT now()
);
```

### Profile table additions
```sql
ALTER TABLE profiles ADD COLUMN ui_theme text DEFAULT 'dark';
ALTER TABLE profiles ADD COLUMN is_prayer_warrior boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN warrior_status text DEFAULT 'offline';
```

---

## New Edge Functions Required

| Function | Trigger | Purpose |
|----------|---------|---------|
| `vector-search` | API call | Hybrid text + vector search |
| `embed-content` | DB trigger on insert/update | Generate embeddings for new content |
| `cleanup-archive` | Cron (daily) | Hard delete archived prayers > 90 days from user view |
| `warrior-notify` | DB trigger on prayer_requests insert | Notify available prayer warriors |

---

## CSS Theme System

The mockup uses CSS custom properties on `:root` for dark (default) and `[data-theme="light"]` for light mode. Every component uses `var()` tokens — no hardcoded colors. To apply:

```javascript
// On app load
const theme = localStorage.getItem('kp-theme') || user.profiles.ui_theme || 'dark';
document.documentElement.setAttribute('data-theme', theme);

// On toggle
function toggleTheme() {
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kp-theme', next);
  supabase.from('profiles').update({ ui_theme: next }).eq('id', userId);
}
```

**Dark tokens:**
```
--bg-deep: #0a0908    --text-primary: #f0e8d8
--bg-surface: #1a1610  --text-body: #c8b898
--gold: #c9a84c        --text-muted: #6b5f4d
```

**Light tokens:**
```
--bg-deep: #f5f0e8      --text-primary: #1a1610
--bg-surface: #ffffff    --text-body: #4a4030
--gold: #8b6914          --text-muted: #8b7f6b
```

---

## Feature Priority for Implementation

### Phase 1 — Foundation (Must Have)
1. Canonical PrayerCard component (replace all 10 variants)
2. Pray Now creation sheet (type/speak/draw)
3. Board rebuild with card + layered layouts
4. New 5-slot bottom navigation
5. Light/dark theme system
6. Focus Mode (fullscreen prayer view)

### Phase 2 — Social
7. Shared prayer landing (conversion-optimized)
8. Circles rebuild (lightweight threads)
9. Testimony on card flip

### Phase 3 — Intelligence
10. PrayerWatch OS (activity logging + personalization)
11. Vector search (`pgvector` + hybrid search)
12. PrayerAssist as omnipresent AI layer
13. Soft delete + admin archive bucket

### Phase 4 — Community
14. Prayer Warrior system (presence + request routing)
15. Prayer request form (text/voice/draw → admin)
16. Explore rotating brand sayings
17. Prayer pattern insights on Profile

### Phase 5 — Polish
18. Strip scrapped features (Games, Blog, WarRoom, PrayTheWorld, etc.)
19. Performance audit + code splitting
20. Desktop responsive pass
21. iOS Capacitor prep

---

## How to Read the Mockup

1. Open `mockup/index.html` in a browser
2. **Hover** any element with a gold dot to see its `@LOVABLE` dev note
3. Use the **Theme** button (top-right) to toggle light/dark
4. Use the **Shared Landing** button to see the new-user conversion page
5. On the Board, use the **layout toggle** (next to filter chips) to switch between card and layered views
6. Tap any prayer **title or text** to enter Focus Mode
7. Tap the **+** nav button to open the Pray Now creation sheet
8. Navigate between screens via the bottom tab bar

Every `data-note` attribute prefixed with `@LOVABLE` is a direct backend integration instruction. Search the HTML for `@LOVABLE` to find all of them.

---

## Files in This Mockup

| File | Purpose |
|------|---------|
| `mockup/index.html` | Complete interactive prototype — all screens, themes, interactions |
| `mockup/lovable-handoff.md` | This document — backend integration guide |
| `.cursor/plans/keeppray.ing_complete_overhaul_*.plan.md` | Original overhaul plan with architecture details |

---

*Generated from the KeepPray.ing overhaul design session. All `@LOVABLE` annotations in the mockup HTML correspond to sections in this document.*
