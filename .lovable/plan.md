

## Analysis: What to Cache Locally on User's Device

After reviewing the full codebase — every hook, page, and data flow — here is what I recommend storing on the user's device using localStorage or IndexedDB for instant load times and reduced server load.

### Current local storage usage
The app already uses localStorage for small flags (bunch awareness, multi-select tips, cooldown timestamps, cross-translation toggle, theme snapshots). Audio TTS is now cached in IndexedDB. But several high-impact, frequently-accessed datasets are fetched fresh from the server on every page load.

---

### Recommended Local Caching Additions

**Priority 1 — High impact, loaded on every session**

| Data | Current behavior | Why cache locally |
|---|---|---|
| **Board preferences** (`useBoardPreferences`) | Fetches from DB on every Board load | Theme, colors, atmosphere — rarely changes. Cache in localStorage, sync in background. Eliminates the "flash of default theme" on load. |
| **User profile / streak** (`useStreak`) | Fetches from `profiles` table every load | Streak counter, longest streak, last prayed date — changes at most once/day. Show cached value instantly, update in background. |
| **Saved prayer cards** (Board page) | Fetches all saved prayers + stats on every Board visit | The user's personal board is their home screen. Cache the card list in IndexedDB (can be large), show instantly, then refresh in background. |
| **User's church info** (`useUserChurch`) | Fetches church + announcements every load | Church name/address/details rarely change. Cache in localStorage. |

**Priority 2 — Frequently accessed, slow to load**

| Data | Current behavior | Why cache locally |
|---|---|---|
| **Bible chapter text** (`useBibleChapterData`) | Fetches verses via edge function proxy every chapter view | Bible text is immutable. Cache fetched chapters in IndexedDB keyed by `versionId:book:chapter`. Huge speedup for re-reads and offline use. |
| **User highlights/notes/bookmarks** (Bible) | Fetched per chapter from DB | Cache alongside chapter data. Show cached, refresh in background. |
| **Sayings** (`useSayingsCycle`) | Fetches all active sayings on every page load | Rarely updated by admin. Cache in localStorage with a 24-hour TTL. |
| **Breath prayers** (`useBreathPrayers`) | Fetches 50 prayers on every Breathe page load | Content changes infrequently. Cache in localStorage/IndexedDB with background refresh. |

**Priority 3 — Nice to have**

| Data | Current behavior | Why cache locally |
|---|---|---|
| **Sermon plans** (`useSermonPlans`) | Fetches plans + memberships each load | Cache plan data, update on sync. |
| **Notifications** (`useNotifications`) | Fetches 50 notifications each load | Cache list, use realtime channel for new ones only. |

---

### Implementation Approach

Create a generic local cache utility: `src/lib/localCache.ts`

- **localStorage** for small JSON data (<100KB): board prefs, streak, church, sayings, breath prayers
- **IndexedDB** (extend existing `keeppraying-audio` DB or create `keeppraying-data`) for larger data: saved prayer cards, Bible chapters + annotations

Each cached item uses a **stale-while-revalidate** pattern:
1. Read from local cache instantly → render UI
2. Fetch from server in background
3. If server data differs, update local cache + UI
4. Store a `cachedAt` timestamp for optional TTL

### Changes Summary

1. **New file: `src/lib/localCache.ts`** — Generic get/set/clear helpers for localStorage (small data) and IndexedDB (large data), with TTL support
2. **Update `useBoardPreferences`** — Read from localStorage first, write-through on save
3. **Update `useStreak`** — Show cached streak instantly, background refresh
4. **Update `useSayingsCycle`** — Cache sayings list with 24h TTL
5. **Update `useUserChurch`** — Cache church info in localStorage
6. **Update `useBibleChapterData`** — Cache chapter verses in IndexedDB (immutable content, no TTL needed)
7. **Update Board page fetch** — Cache saved prayer card list in IndexedDB, stale-while-revalidate
8. **Update `useBreathPrayers`** — Cache in localStorage with 1h TTL

### Technical details

- Stale-while-revalidate means the user always sees *something* instantly — no spinners on repeat visits
- Background syncs keep data fresh without blocking UI
- localStorage limit is ~5MB per origin — sufficient for prefs, streak, sayings, church
- IndexedDB has no practical limit — suitable for Bible chapters and prayer card lists
- All caches are keyed by user ID to support multi-account scenarios
- Realtime subscriptions (streak, notifications) still work and update the local cache when events arrive

