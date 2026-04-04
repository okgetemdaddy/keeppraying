

## Classical Prayers — Premium Tabbed Cards + Admin MD Bulk Import

### Overview
Four changes: (1) merge `extended_text` into `prayer_text` and drop the column, (2) redesign VaultCard with a 3-tab internal layout (Prayer / Context / Source), (3) add an MD bulk-import feature to the admin tab, (4) clean up admin form and save logic.

### 1. Database Migration

```sql
-- Merge extended_text into prayer_text where populated
UPDATE classical_prayers
SET prayer_text = prayer_text || E'\n\n' || extended_text
WHERE extended_text IS NOT NULL AND extended_text != '';

-- Drop column
ALTER TABLE classical_prayers DROP COLUMN extended_text;
```

### 2. VaultCard Tabbed Redesign

Replace the current accordion expand with a 3-tab pill navigation inside each expanded card:

```text
┌─────────────────────────────────────────────┐
│  ✦  Prayer Title                            │
│     AUTHOR · ERA                            │
│     "Preview snippet…"                      │
├─────────────────────────────────────────────┤
│  [ Prayer ]  [ Context ]  [ Source ]        │
├─────────────────────────────────────────────┤
│                                             │
│  Full prayer in serif text-base leading-8   │
│  with drop cap and VerseLinks               │
│                                             │
│  [label chips]     [ Save to My Board ]     │
└─────────────────────────────────────────────┘
```

- **Prayer tab**: `font-serif text-base md:text-lg leading-8 whitespace-pre-line`, first-letter drop cap (`first-letter:text-5xl`), all text processed via `renderWithVerseLinks()`
- **Context tab**: Author era badge, labels as themed chips, theological period info
- **Source tab**: Source reference in quiet monospaced style
- Tab pills: `text-[11px] px-3 py-1 rounded-full`, active = `bg-primary/15 text-primary`
- Card hover: `hover:shadow-xl hover:ring-1 hover:ring-primary/10 transition-all duration-300`

Applied in both `ClassicalPrayersLibrary.tsx` (dialog) and `Classical.tsx` (standalone page).

### 3. Admin MD Bulk Import

Add a "Bulk Import from Markdown" button alongside the existing "Add Classical Prayer" button. Opens a textarea where the admin pastes a Markdown file. The parser extracts multiple prayers from a structured format:

**Expected MD format:**
```markdown
## Prayer Title
**Author:** St. Augustine
**Era:** 4th Century
**Source:** Confessions
**Labels:** devotion, confession, grace

Prayer text goes here, spanning multiple lines
until the next `##` heading or end of file.
```

**Implementation:**
- Parse the MD on the client side — split by `## ` headings, extract metadata from `**Key:**` lines, remainder = prayer text
- Show a preview list of parsed prayers with count ("Found 12 prayers")
- Admin clicks "Import All" to batch-insert via Supabase
- Each insert includes `created_by: user.id`
- Toast reports success count and any failures

### 4. Admin Form Cleanup

- Remove `extended_text` field from the form state, inputs, reset function, edit prefill, and save payload
- Remove `extended_text` from the `ClassicalPrayer` interface in Admin.tsx

### Files

| File | Action |
|------|--------|
| **Migration** | Merge `extended_text` → `prayer_text`, drop column |
| `src/components/ClassicalPrayersLibrary.tsx` | Redesign VaultCard with 3-tab layout, remove `extended_text`, upgrade typography |
| `src/pages/Classical.tsx` | Same tabbed card redesign, remove `extended_text` from interface and save logic |
| `src/pages/Admin.tsx` | Remove `extended_text` from form; add MD bulk-import UI with parser and batch insert |

### Technical Notes
- MD parser is a simple client-side function (~40 lines) — no external dependency needed
- Tab state is local per card (`useState<'prayer'|'context'|'source'>('prayer')`)
- The `saveToBoard` function drops `extended_prayer` from the insert payload

