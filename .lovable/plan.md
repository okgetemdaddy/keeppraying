

## Add TTS Audio Manager to Guardian Portal

### Overview
Add a new "Audio Cache" admin tab that lists all files in the `prayer-audio` storage bucket, lets admins preview/play them, see file sizes and dates, and delete individual files or bulk-clear old cache entries.

### Changes

**1. New component: `src/components/admin/AudioCacheTab.tsx`**
- List all files in `prayer-audio` bucket using `supabase.storage.from('prayer-audio').list()`
- Display in a table: filename, size (formatted), created date, type (`.mp3` vs `_phrases.json`)
- Group by cache ID (e.g. show `prayer_abc123` with its `.mp3` and `_phrases.json` as one row)
- Play button: inline `<audio>` element to preview `.mp3` files
- Delete button: removes both the `.mp3` and `_phrases.json` for a given cache ID
- "Delete All" button with confirmation dialog for bulk cache clearing
- Search/filter input to find files by name
- Show total count and total storage size at the top

**2. Update `src/pages/Admin.tsx`**
- Add `"audio-cache"` to the `TabId` union type
- Add nav item: `{ id: "audio-cache", label: "Audio Cache", icon: Volume2 }`
- Import and render `AudioCacheTab` when tab is active
- Import `Volume2` from lucide-react

### Technical Details
- Uses `supabase.storage.from('prayer-audio').list()` which returns file metadata including `name`, `created_at`, and `metadata.size`
- Deletion uses `supabase.storage.from('prayer-audio').remove([path])`
- Pagination: fetch in batches of 100 with offset since bucket could grow large
- No database migration needed — purely reads/writes storage via the JS client

