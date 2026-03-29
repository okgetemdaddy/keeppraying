

# Phase 1: Bible Interaction Schema, RLS & Preference State

## Overview

Create five new database tables to power highlights, notes, bookmarks, and the "Verse Bunch" grouping system. All tables are user-scoped with strict RLS. A user preference for suppressing the Verse Bunch dialog will be stored in the existing `board_preferences` pattern (localStorage for simplicity, upgradeable later).

## Database Migration

A single migration creating all five tables, compound indexes, and RLS policies.

### Tables

**1. `user_highlights`**
- `id` (uuid PK, default gen_random_uuid())
- `user_id` (uuid, NOT NULL, references auth.users ON DELETE CASCADE)
- `version_id` (integer, NOT NULL) — Bible version ID
- `book_usfm` (text, NOT NULL) — e.g. "GEN"
- `chapter_number` (integer, NOT NULL) — e.g. 1
- `verse_number` (integer, NOT NULL)
- `color` (text, NOT NULL, default 'yellow')
- `reference_normalized` (jsonb, NOT NULL) — stores partial-verse char ranges: `{ "start": 0, "end": 42 }` for substring highlighting; `null`/omitted means whole verse
- `created_at` (timestamptz, default now())

**2. `user_notes`**
- `id` (uuid PK)
- `user_id` (uuid, NOT NULL, references auth.users ON DELETE CASCADE)
- `version_id` (integer, NOT NULL)
- `book_usfm` (text, NOT NULL)
- `chapter_number` (integer, NOT NULL)
- `verse_number` (integer, NOT NULL)
- `note_content` (text, NOT NULL)
- `created_at` / `updated_at` (timestamptz)

**3. `user_bookmarks`**
- `id` (uuid PK)
- `user_id` (uuid, NOT NULL, references auth.users ON DELETE CASCADE)
- `version_id` (integer, NOT NULL)
- `book_usfm` (text, NOT NULL)
- `chapter_number` (integer, NOT NULL)
- `verse_number` (integer, NOT NULL)
- `created_at` (timestamptz)
- UNIQUE constraint on `(user_id, version_id, book_usfm, chapter_number, verse_number)`

**4. `verse_bunches`**
- `id` (uuid PK)
- `user_id` (uuid, NOT NULL, references auth.users ON DELETE CASCADE)
- `bunch_name` (text, NOT NULL)
- `description` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**5. `verse_bunch_items`**
- `id` (uuid PK)
- `bunch_id` (uuid, NOT NULL, references verse_bunches(id) ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, references auth.users ON DELETE CASCADE) — denormalized for RLS
- `version_id` (integer, NOT NULL)
- `book_usfm` (text, NOT NULL)
- `chapter_number` (integer, NOT NULL)
- `verse_number` (integer, NOT NULL)
- `created_at` (timestamptz)
- UNIQUE on `(bunch_id, version_id, book_usfm, chapter_number, verse_number)`

### Compound Indexes

On `user_highlights`, `user_notes`, `user_bookmarks`, and `verse_bunch_items`:
```
CREATE INDEX idx_{table}_chapter_lookup
ON {table} (user_id, version_id, book_usfm, chapter_number);
```

### RLS Policies

All five tables get RLS enabled with four identical policy patterns:
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id` (WITH CHECK)
- **UPDATE**: `auth.uid() = user_id`
- **DELETE**: `auth.uid() = user_id`

### "Don't Show Again" Preference

Use **localStorage** key `bible_bunch_dialog_dismissed` (boolean). This avoids an extra DB column, is instant, and aligns with this being a UI preference. Can be migrated to a DB column later if cross-device sync is needed.

## Files Changed

1. **New migration** — Single SQL migration via the migration tool containing all CREATE TABLE, INDEX, ALTER TABLE ENABLE RLS, and CREATE POLICY statements.

No code files change in Phase 1. The migration is the deliverable.

## What Happens Next

After you confirm the migration ran successfully, Phase 2 will create the `useBibleChapterData` hook with concurrent fetching.

