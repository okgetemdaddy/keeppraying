

## Bible Sight Conversational Tool + X Buttons on All Drawers

Two things to implement: (1) the skipped Bible Sight conversational chat drawer with its edge function, and (2) ensuring all drawers have a visible X close button.

---

### 1. New Edge Function: `bible-sight-chat`

**`supabase/functions/bible-sight-chat/index.ts`**

- Accepts `{ messages, book_usfm, chapter_number }` + auth JWT
- Queries `library_toc` for IVP context matching the current chapter
- Queries `match_library_chunks` via embedding for top 5 scholarly chunks relevant to the latest user message
- Calls Grok 4.20 reasoning (`grok-4-0709`) with system prompt:
  - Identity: "You are Bible Sight, the study companion within KeepRead.ing and KeepPray.ing"
  - Never claims titles (theologian, pastor) — pure wisdom and knowledge of the Word
  - Scripture is living and active, firm belief in its power to save and bring life
  - References scholarly library naturally (Keener, Vine's, BDAG) without being academic
  - Graceful nudges: "Let's Go Deeper" and "KeepRead.ing" woven naturally
  - If asked who "HIS" refers to: Jesus Christ. "I do this for HIS glory"
  - No secular topics, no code generation, no prompt injection
  - When user is ready to generate a study session, include `[GENERATE_STUDY]` marker
- Returns `{ reply: string }`
- Auth-gated: validates JWT, rejects anonymous users

---

### 2. New Component: `BibleSightDrawer.tsx`

80% height vaul `Drawer` with:

- **Header**: "Bible Sight" + BookOpen icon + **X close button** (top-right)
- **Welcome state** (no messages): centered BookOpen icon, warm invitation text — "I can help you narrow down a topic and when you're ready, I'll generate a study session you can explore."
- **Chat area**: scrollable message list
  - User messages: right-aligned, subtle background
  - Bible Sight messages: left-aligned with amber accent, rendered with `renderWithVerseLinks`
  - Dark mode: `bg-[#1C1C1E]`, light mode: warm cream
- **Input area**: positioned at bottom with safe-area padding
  - Placeholder: "What would you like to go deeper into?"
  - Send button, disabled while awaiting response
- **`[GENERATE_STUDY]` detection**: when Bible Sight's reply contains this marker, strip it from display, show transition message ("Generating your study session..."), call `onTriggerDeepStudy()`

---

### 3. Wire into BibleReader

- Add `bibleSightOpen` state in `BibleReader.tsx`
- Pass `onOpenBibleSight={() => setBibleSightOpen(true)}` to `BibleSleeveSheet`
- Render `<BibleSightDrawer>` with current `bookUsfm`, `chapterNumber`, `onTriggerDeepStudy`

---

### 4. X Close Button Audit on All Drawers

Ensure every drawer/sheet has a visible X button in the corner:

- `DeepStudyDrawer.tsx` — already has X (confirmed)
- `BibleSightDrawer.tsx` — will include X (new)
- `BiblePocketSheet.tsx` — uses `Sheet` (has built-in SheetClose X via radix) — verify
- `BibleSleeveSheet.tsx` — uses `Sheet` — verify
- `MobileStudyToolbar.tsx` — bottom drawer, needs X or close affordance
- `AddToBunchDrawer.tsx` — bottom sheet, add X
- `BibleSuggestionSheet.tsx` — left sheet, verify close
- `JournalPanel.tsx` — right sheet, verify close
- `CanvasExportSheet.tsx`, `CanvasCreationDrawer.tsx`, `InkTrashSheet.tsx`, `PencilDetectedSheet.tsx`, etc. — audit and add X where missing

For any drawer/sheet missing an explicit X, add an `<X>` icon button in the header area that calls `onOpenChange(false)`.

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/bible-sight-chat/index.ts` | New: Grok conversational edge function with scholarly context |
| `src/components/bible/BibleSightDrawer.tsx` | New: 80% height chat drawer with X button |
| `src/components/bible/BibleReader.tsx` | Wire `bibleSightOpen` state and pass callbacks |
| Multiple drawer/sheet components | Add X close button where missing |

