

## Fix: Upload Links Tab Showing Blank Content

### Root Cause

The `UploadLinksTab` component is rendering but likely stuck in a perpetual loading state or has invisible content. Two issues:

1. **RLS query may silently return empty/fail** — the `loadTokens` query uses the authenticated client, which requires the `has_role(auth.uid(), 'admin')` check. If the query errors, the component stays in loading state with a nearly invisible spinner on the dark admin background.

2. **No error handling on the SELECT query** — if the query fails due to RLS or missing table, `data` is null, tokens stays empty, but the loading spinner may not dismiss properly if the error path isn't handled.

### Fix (UploadLinksTab.tsx)

1. Add proper error handling to `loadTokens` — catch errors and still set `loading = false`
2. Add a visible header/title so the tab is never fully blank
3. Add error state feedback if the query fails
4. Ensure the "Generate Link" input + button always renders regardless of loading state

### Also: Upload.tsx Page

Since the `/upload` page was created alongside this tab, verify it exists and renders properly — it's the guest-facing page that uses the tokens.

### Files Modified

| File | Change |
|------|--------|
| `src/components/admin/UploadLinksTab.tsx` | Add header, error handling, ensure UI always visible |

