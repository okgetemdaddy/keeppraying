

# KeepPray.ing — Complete Codebase Audit

---

## 1. Every Page, Component, Table, Subscription & Feature

### Pages (14 routes)

| Route | File | Description |
|---|---|---|
| `/` | Index.tsx (660 lines) | Homepage: animated hero with particle canvas, hero-bg.jpg, Feature Carousel (6 slides), daily verse section, FAQ accordion, contact form |
| `/auth` | Auth.tsx | Sign up / sign in with email+password |
| `/reset-password` | ResetPassword.tsx | Password reset flow |
| `/prayers` | Prayers.tsx (831 lines) | Public prayer feed with search, tag filtering, like/prayed/bookmark/share/TTS actions, comments, testimony pills, source badges |
| `/prayer/:id` | Prayer.tsx | Individual prayer detail with background image support, TTS, comments, enrichment panel |
| `/board` | Board.tsx (831 lines) | **Protected.** Personal prayer board with drag-and-drop grid, theme selector, ambient audio, mobile column toggle, card sizing, playlists |
| `/assistant` | PrayerAssist.tsx (253 lines) | AI chat companion (calls `prayer-assist` edge function), renders verse links and prayer card links inline |
| `/war-room` | WarRoom.tsx (584 lines) | Immersive prayer reading space with 4 themes, 5 audio tracks, font selector, particle canvas, playlist support |
| `/testify` | Testify.tsx (746 lines) | Testimony feed with likes, comments, flagging, linked prayer cards, manual profile hydration |
| `/games` | Games.tsx (349 lines) | Bible Trivia (AI-generated via edge function), Verse Flashcards, Memory Match |
| `/blog` | Blog.tsx | Public blog feed (KeepGrow.ing) |
| `/blog/:slug` | BlogPost.tsx | Individual blog post with "pray this" button that creates a prayer card |
| `/admin` | Admin.tsx (1359 lines) | **Admin-only.** Dark "Guardian Portal" with 10 tabs: Overview, Review Queue, Users, Analytics, Moderation Log, Prayers, KeepGrow.ing, Verses, FAQ, Contacts |
| `*` | NotFound.tsx | 404 page |

### Components

| Component | Purpose |
|---|---|
| `SiteNav` | Global nav bar |
| `NavLink` | Nav link helper |
| `FeatureCarousel` | 6-slide Framer Motion welcome carousel on homepage |
| `AddPrayerModal` | Modal for creating new prayers |
| `Comments` | Real-time comments on prayer cards (with Supabase Realtime subscription) |
| `AIEnrichPanel` | Sheet panel for AI tag/verse suggestions on prayers |
| `VerseLink` | Clickable scripture reference that links to verse detail |
| `PrayerCardLink` | Inline prayer card reference from AI assistant |
| **board/** | |
| `BoardCard` | Prayer card component for the board with size variants, background images, font customization, actions |
| `ThemeCanvas` | Animated background canvas for board themes |
| `ThemeSelector` | Theme picker dropdown |
| `AmbientPlayer` | Howler.js audio player with volume controls |
| `TestifyBack` | Testimony sheet/back-of-card for submitting testimonies |
| `boardThemes.ts` | Theme definitions (golden-sunrise, midnight, dawn, etc.) |
| `useAmbientAudio.ts` | Hook for ambient audio state |
| **admin/** | |
| `AIInsightsTab` | AI-powered analytics tab |
| `AIInsightButton` | Button to trigger AI insight generation |
| `AnomalyAlert` | Alert component for detected anomalies |
| `InsightsMetricCard` | Metric card for insights dashboard |
| `NLQueryBox` | Natural language query input |
| `ReportViewer` | Report rendering component |
| `SuggestionPanel` | AI suggestion display |
| `UserMonitorTab` | User management/monitoring table |

### Database Tables (17 tables)

| Table | Key Columns | Notes |
|---|---|---|
| `profiles` | id, email, full_name, avatar_url, role | Created via `handle_new_user()` trigger on auth.users |
| `prayer_cards` | title, prayer_text, extended_prayer, tags, text_style, background_url, source, status, likes_count, prayed_count, views, created_by | Core content table. `source` set by `set_prayer_source()` trigger |
| `user_saved_prayers` | user_id, prayer_id, pinned, favorite, position, card_size, grid_position, notes | Board state per user |
| `likes` | user_id, prayer_id | Triggers `update_prayer_likes_count()` |
| `prayed_actions` | user_id, prayer_id | Triggers `update_prayer_prayed_count()` |
| `comments` | user_id, prayer_id, text | Real-time enabled |
| `testimonies` | user_id, prayer_id, body, flagged | Linked to prayers |
| `testimony_likes` | testimony_id, user_id | |
| `testimony_comments` | testimony_id, user_id, body | |
| `testimony_flags` | testimony_id, user_id, reason | |
| `board_preferences` | user_id, theme, sound_id, sound_volume, animations_enabled | |
| `prayer_playlists` | user_id, name, prayer_ids | Array of prayer UUIDs |
| `blog_posts` | title, slug, content, excerpt, cover_image_url, published, author_id | |
| `verse_summaries` | reference, verse_text, summary, exegesis | Cached verse data |
| `contact_submissions` | name, email, message, ai_reply, replied_at | |
| `admin_reports` | title, content, report_type | |
| `ai_monitor_reports` | report_type, summary, anomalies, suggestions, key_metrics, report_content | |
| `ai_chat_logs` | user_id, user_message, ai_response | |
| `site_logs` | type, message, user_id, metadata | |

### Realtime Subscriptions

Only **one** active realtime subscription exists:
- `Comments.tsx` subscribes to `postgres_changes` on `comments` table filtered by `prayer_id` for INSERT and DELETE events.

No realtime is enabled at the publication level (no `ALTER PUBLICATION supabase_realtime ADD TABLE` found in migrations).

### Edge Functions (10)

| Function | Purpose |
|---|---|
| `prayer-assist` | AI chat companion (Gemini/GPT) |
| `enrich-prayer` | AI tag and verse suggestions |
| `moderate-prayer` | Content moderation on prayer submission |
| `moderate-testimony` | Content moderation on testimony submission |
| `prayer-tts` | Text-to-speech via ElevenLabs |
| `verse-summary` | AI verse summary/exegesis generation |
| `bible-quiz` | AI-generated trivia questions |
| `contact-form` | Contact form submission with AI reply |
| `faq-report` | FAQ report generation |
| `ai-monitor` | AI analytics monitoring |

### Storage Buckets
- `prayer-backgrounds` (public) — user-uploaded card backgrounds
- `avatars` (public) — user profile images

---

## 2. Drag-and-Drop Status

**Drag-and-drop has NOT been removed.** It is actively used in `Board.tsx`:

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are all in `package.json`
- `Board.tsx` imports `DndContext`, `SortableContext`, `useSortable`, `arrayMove`, `rectSortingStrategy`, sensors (Pointer, Touch, Keyboard)
- A `SortableBoardCard` wrapper component uses `useSortable` for each card
- `handleDragEnd` reorders cards and persists `grid_position` to `user_saved_prayers`
- The entire board grid is wrapped in `<DndContext>` → `<SortableContext>`

**There are no "