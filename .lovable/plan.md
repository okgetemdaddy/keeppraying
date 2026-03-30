

## Plan: Add NIV to Bible Reader as Default Version

### Problem
The NIV (id: 111, abbreviation "NIV11") is **available** via the YouVersion API when accessed directly by ID, but it does NOT appear in the `/bibles?language_ranges[]=en` listing (which only returns 12 public-domain versions). Since the version selector is populated solely from that listing, NIV never shows up.

### Confirmed via API Testing
- `/bibles/111` returns full NIV metadata (title: "New International Version 2011", localized_abbreviation: "NIV")
- `/bibles/111/passages/JHN.1.1?content_type=json` returns verse text correctly
- `/bibles/111/index` and `/bibles/111/books/JHN/chapters/1` work correctly

### Solution
Inject the NIV version into the versions list by fetching it separately, then default to it.

### Changes

#### 1. Update `src/hooks/useBibleReader.ts` — `useBibleVersions` hook
- After fetching the public versions list, also fetch `/bibles/111` (NIV) directly
- If NIV is not already in the list, prepend it
- This ensures NIV always appears in the selector

#### 2. Update `src/components/bible/BibleReader.tsx` — default selection
- Change the auto-select logic to prefer NIV (id 111) first, then BSB as fallback
- Update the comment accordingly

### Technical Details

In `useBibleVersions`:
```typescript
queryFn: async () => {
  // Fetch public list + NIV (licensed, not in public list) concurrently
  const [listRes, nivRes] = await Promise.all([
    fetchBible<{ data: BibleVersion[] }>("/bibles?language_ranges[]=en"),
    fetchBible<BibleVersion>("/bibles/111").catch(() => null),
  ]);
  const versions = listRes.data;
  // Inject NIV if not already present
  if (nivRes && !versions.some((v) => v.id === 111)) {
    versions.unshift(nivRes);
  }
  return versions;
}
```

In `BibleReader.tsx` auto-select:
```typescript
const niv = versions.find((v) => v.id === 111);
const bsb = versions.find((v) => v.abbreviation === "BSB");
setVersionId(niv?.id ?? bsb?.id ?? versions[0].id);
```

### Files

| File | Action |
|---|---|
| `src/hooks/useBibleReader.ts` | Update `useBibleVersions` to also fetch NIV by ID |
| `src/components/bible/BibleReader.tsx` | Update default version to prefer NIV |

