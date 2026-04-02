

# Remove "AI" Branding — Rename to Warm, Ministry-Focused Language

## Summary
Replace every user-facing "AI" mention across the app with your chosen alternatives. Admin-only pages stay as-is (only you see them).

## Change Map

| Current Text | New Text | File(s) |
|---|---|---|
| "AI-Crafted Prayers" | **"Assisted Prayers"** | `App.tsx` (Board AuthGate features) |
| "AI-guided prayer crafting" | **"PrayerAssist-powered prayer crafting"** | `SiteNav.tsx` |
| "AI-guided prayer life" | **"PrayerAssist-powered prayer life"** | `map/GrowthCTA.tsx` |
| "✦AI" / "AI Generated" badge on prayer cards | **"✦ PrayerAssist"** | `Prayer.tsx`, `Prayers.tsx`, `BoardCard.tsx`, `PrayerViewerModal.tsx` |
| "AI-generated" label text | **"PrayerAssist-generated"** | `Prayers.tsx` |
| "AI Enrichment" panel title | **"Auto Verses & Labels"** | `AIEnrichPanel.tsx` |
| "AI reads your prayer deeply…" description | **"Your prayer is read deeply…"** | `AIEnrichPanel.tsx` |
| "AI will read your prayer's substance…" | **"Your prayer's substance will be read…"** | `AIEnrichPanel.tsx` |
| "AI Enrich" dropdown item | **"Enrich with Scripture"** | `BoardCard.tsx` |
| "AI Enrichment" on SharedPrayerLanding | **"Auto Verses & Labels"** | `SharedPrayerLanding.tsx` |
| "AI Encouragement" | **"Spiritual Encouragement"** | `App.tsx` (Circles AuthGate), `InviteLanding.tsx` |
| "Our Stance on AI" links + section | **"Our Heart Behind the Tools"** | `Support.tsx`, `Board.tsx`, `SermonSync.tsx`, `PrayerAssist.tsx` |
| "AI prayer companion" | **"PrayerAssist-powered prayer companion"** | `PrayerAssist.tsx` |
| "Analyzing with AI…" loading text | **"Analyzing sermon…"** | `SermonSync.tsx` |
| "AI credits exhausted" toast | **"Credits exhausted"** | `TestimonyEnrichModal.tsx` |
| "AI enrichment failed" toast | **"Enrichment failed"** | `TestimonyEnrichModal.tsx` |
| "Getting AI summary…" loading | **"Getting summary…"** | `VerseLink.tsx` |
| "AI summary" hover tooltip | **"Verse summary"** | `Index.tsx` |
| "AI Suggestions" Bible search heading | **"Suggested Verses"** | `BibleSearchDialog.tsx` |
| "Review AI enrichment" comment | Just a code comment — update for clarity | `AddBreathPrayerModal.tsx` |
| "Auto-enrich with AI" comment | Code comment — update | `AddBreathPrayerModal.tsx` |
| `labels: ["voice-prayer", "ai-refined"]` | `labels: ["voice-prayer", "assisted"]` | `VoiceRecorder.tsx` |

### Files NOT changed (admin-only, internal)
- `Admin.tsx`, `AIInsightsTab.tsx`, `AIInsightButton.tsx`, `SuggestionPanel.tsx`, `UserDetailPanel.tsx`, `PrayerRequestsInbox.tsx` — these are your admin dashboard, only you see them.

## Total: ~20 files modified, zero database or logic changes — purely string replacements.

