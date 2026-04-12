

## Full Rewrite: TestifyBack.tsx → TestimonyCanvasAsset Visual Shell + Real Data

### What
Replace TestifyBack.tsx entirely with the TestimonyCanvasAsset design (coffee/cream palette, GloryParticles, glow effects, 3 compose modes) while wiring in the existing Supabase data layer (testimonies CRUD, praise, flag, comments, enrich modal).

### Single File Changed
`src/components/board/TestifyBack.tsx` — full rewrite (~600 lines)

### Structure

**Visual layer copied verbatim from TestimonyCanvasAsset:**
- Coffee gradient background (`#3d3328 → #322a20 → #2a231a`)
- `GloryParticles` component (inline)
- Inner glow + top glory light + bottom glory wash CSS animations
- Header: ArrowLeft + "TESTIMONY" gold uppercase label
- Testimony list: rounded-2xl cards with `canvasBg`, gradient avatar circles, 🙌 praise + bookmark top-right
- Expanded testimony view with full text, praise count, "Save to Room"
- Compose modes: Type (textarea) | Speak (mic pulse) | Write (`HandwriteCanvas` inline)
- Gold gradient "✝ Testify" CTA button
- "Testify to His Goodness" italic tagline

**Data layer preserved from current TestifyBack:**
- `fetchTestimonies()` — Supabase query with profiles join, praise/flag/comment counts
- `togglePraise()` — testimony_praises insert/delete
- `handleFlag()` — testimony_flags insert
- `fetchComments()` / `submitComment()` — testimony_comments CRUD
- `handleShare()` — clipboard link copy
- `TestimonyEnrichModal` integration — opens before posting typed testimony
- `alreadyTestified` check — hides compose CTA if user already testified
- Comments UI inside expanded testimony view (kept from current, styled to match canvas palette)

**Mapping mock data → real data:**
- `TESTIMONIES` mock array → `testimonies` state from Supabase
- `t.author` → `testimony.profiles?.full_name || "Anonymous"`
- `t.initial` → first letter of display name
- `t.gradient` → deterministic gradient from user_id hash
- `t.praises` → `testimony.praise_count`
- `t.date` → relative time from `testimony.created_at`
- `expandedId: number` → `expandedId: string` (Supabase UUID)

**Compose flow wiring:**
- Type mode textarea → captures to `body` state, "Post" button → `handleShareClick()` → opens `TestimonyEnrichModal`
- Speak mode → visual placeholder (mic pulse), future phase wiring
- Write mode → `HandwriteCanvas` visual placeholder, future phase wiring

### Props (unchanged)
```
prayerId: string
prayerAuthorId: string | null | undefined
onFlipBack: () => void
```

`accentColor`, `textColor`, `cardBg` props removed — the canvas uses its own hardcoded coffee palette (matching the design lab exactly).

