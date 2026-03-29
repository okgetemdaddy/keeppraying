

## Calendar Color Picker + Meeting Key + 3-Day Advance Notifications

### Overview
Three additions to the Prayer Calendar:
1. A color picker button in the legend row (lower right) letting users change calendar background/text/accent — using the same 8 Theme Sanctuary presets
2. A new calendar key for circle and family room scheduled meetings, displayed as calendar events
3. A database trigger + notification that alerts users 3 days before any circle or family room meeting

---

### 1. Calendar Color Picker

**Where**: Bottom-right of the existing legend row (line 476-488 of `PrayerCalendar.tsx`)

**Implementation**:
- Add a small `Palette` icon button at the end of the legend row
- On click, open a popover (using shadcn `Popover`) showing the 8 `THEME_SANCTUARY_PRESETS` as circular swatches
- Selecting a preset saves the calendar color to `board_preferences` via a new column `calendar_bg`, `calendar_text`, `calendar_accent`
- The calendar currently hardcodes `#F5F0E8` / `#2C2418` — replace those with state driven by the saved preference, falling back to Pure Sand defaults

**DB Migration**: Add 3 columns to `board_preferences`:
```sql
ALTER TABLE public.board_preferences
  ADD COLUMN calendar_bg text DEFAULT '#F5F0E8',
  ADD COLUMN calendar_text text DEFAULT '#2C2418',
  ADD COLUMN calendar_accent text DEFAULT '#B85C38';
```

**Files changed**:
- `src/components/board/PrayerCalendar.tsx` — add Popover color picker, accept/use saved colors
- `src/hooks/useBoardPreferences.ts` — extend interface and fetch/save for calendar colors

### 2. Circle & Family Room Meeting Events on Calendar

**Where**: Inside `fetchEvents` in `PrayerCalendar.tsx`

**Implementation**:
- After fetching existing events, also fetch:
  - All circles the user is a member of (via `accountability_circle_members`) → join to `accountability_circles` to get `schedule` jsonb
  - All family rooms the user is a member of (via `family_room_members`) → join to `family_rooms` to get `schedule` jsonb
- The `schedule` jsonb has shape `{ day: string, time: string, description: string }` where `day` is a weekday name
- For each scheduled circle/family room, compute which dates in the current calendar range fall on that weekday and add them as `CalendarEvent` entries with types `circle_meeting` and `family_meeting`
- Add two new entries to `EVENT_CONFIG`:
  - `circle_meeting`: icon `Users`, distinct blue-purple color
  - `family_meeting`: icon `Home`, distinct warm color
- Add these to the legend

**New event types added to `CalendarEvent["type"]`**:
```ts
"circle_meeting" | "family_meeting"
```

### 3. Three-Day Advance Meeting Notifications

**Implementation**: A Supabase Edge Function (`meeting-reminders`) that runs daily via `pg_cron`:
- Queries all circles and family rooms that have a `schedule` with a `day` value
- For each, checks if the next occurrence of that weekday is exactly 3 days from now
- If so, finds all members and inserts a notification:
  - Type: `meeting_reminder`
  - Title: "📅 [Circle/Family Room name] meets in 3 days"
  - Body: "[Day] at [Time] — [description]"
  - Link: `/circles/[id]` or `/family/[id]`

**Files created**:
- `supabase/functions/meeting-reminders/index.ts`

**Cron job** (via insert tool, not migration):
```sql
SELECT cron.schedule(
  'daily-meeting-reminders',
  '0 9 * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Technical Details

**PrayerCalendar.tsx changes summary**:
- Import `Popover`, `PopoverTrigger`, `PopoverContent`, `Palette` icon, and `THEME_SANCTUARY_PRESETS`
- Add props for `boardPrefs` and `onUpdateCalendarColor` callback
- Replace hardcoded `#F5F0E8`/`#2C2418` with preference-driven state
- Add color picker popover in legend row (right-aligned)
- Add circle/family meeting schedule fetching in `fetchEvents`
- Add `circle_meeting` and `family_meeting` to `EVENT_CONFIG` and legend

**useBoardPreferences.ts changes**:
- Add `calendar_bg`, `calendar_text`, `calendar_accent` to `BoardPrefs`
- Include in upsert/fetch

**Board.tsx changes**:
- Pass board preferences and update handler to `PrayerCalendar`

**Edge function** (`meeting-reminders`):
- Uses service role key to query all circles/family rooms with schedules
- Computes 3-day-ahead check using day-of-week math
- Inserts notifications for all relevant members
- Deduplication: checks if a reminder notification already exists for this meeting this week

