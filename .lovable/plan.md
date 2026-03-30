

## Plan: Set NIV as the default Bible version

### Context
The NIV license (`version_id=111`) is now active on your YouVersion App Key. The test fetch of John 1 returned HTTP 200 successfully. Currently, BibleReader defaults to BSB.

### Change (1 file)

**`src/components/bible/BibleReader.tsx`** — Line 474

Change the auto-select logic to prefer NIV first, falling back to BSB:

```typescript
// Before:
const bsb = versions.find((v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB");
setVersionId(bsb ? bsb.id : versions[0].id);

// After:
const niv = versions.find((v) => v.abbreviation === "NIV" || v.localized_abbreviation === "NIV");
const bsb = versions.find((v) => v.abbreviation === "BSB" || v.localized_abbreviation === "BSB");
setVersionId(niv ? niv.id : bsb ? bsb.id : versions[0].id);
```

This prioritizes NIV → BSB → first available version. One line change, no new files or migrations needed.

