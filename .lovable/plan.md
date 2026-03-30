

## Upgrade My Church: Visual Identity Extraction

### Problem
The current scrape only extracts text data. The My Church section uses generic board theme colors and has no visual identity — no logo, no pastor photo, no church brand colors. It looks the same for every church.

### Strategy: Two-Pass Extraction

The edge function already fetches the raw HTML. We'll extract visual assets programmatically from the HTML first (images, CSS colors, meta tags), then pass that structured data to Grok for intelligent identification.

```text
Pass 1 (Programmatic):
  HTML → extract all <img> srcs, og:image, favicon
       → extract meta theme-color, CSS custom properties, inline bg colors
       → resolve all relative URLs to absolute

Pass 2 (Grok):
  Cleaned HTML + image URL list + color candidates
  → Grok identifies: which image is the logo, which is the pastor
  → Grok confirms/refines color palette
  → Grok produces rich structured summary
```

### Changes

**1. Edge function: `supabase/functions/scrape-church-info/index.ts`**

Add a pre-processing step before the Grok call:

- **Image extraction**: Parse all `<img>` tags, `<link rel="icon">`, `<meta property="og:image">`, CSS `background-image` URLs. Resolve relative URLs to absolute using the website's base URL. Deduplicate. Pass the list (up to ~50 URLs) to Grok.

- **Color extraction**: Parse `<meta name="theme-color">`, CSS custom properties (`--primary`, `--brand`, etc.), inline `background-color` and `color` styles. Extract hex/rgb values. Pass as color candidates to Grok.

- **Updated Grok prompt** adds these fields to the JSON output:
  - `logo_url`: The church's main logo image URL (Grok picks from the extracted image list)
  - `pastor_image_url`: Pastor/staff photo URL if identifiable
  - `hero_image_url`: A prominent hero/banner image
  - `color_palette`: `{ primary, secondary, accent, background, text }` — hex values representing the church's brand colors
  - `favicon_url`: Favicon/icon URL

- **Increase HTML slice** from 50KB to handle more content for image/color extraction

**2. UI: `src/components/board/MyChurchSection.tsx`**

Complete visual redesign of the church card using the extracted brand identity:

- **Church-branded header**: Use `color_palette.primary` as accent color for the section header, borders, and badges
- **Logo display**: Show `logo_url` as a small rounded logo next to the church name
- **Pastor card**: If `pastor_image_url` exists, show a small avatar with pastor name/title
- **Hero image**: If `hero_image_url` exists, show as a subtle background or banner at the top of the section
- **Dynamic theming**: Cards within the My Church section use `color_palette.primary` for accents, `color_palette.secondary` for backgrounds — making each church's section feel uniquely theirs
- **Social links**: Style with church brand colors instead of generic white/transparent
- **Give Online / Live Stream buttons**: Use church primary color

- Fallback: If no color palette was extracted, fall back to the existing `textColor`-based styling

**3. Hook: `src/hooks/useUserChurch.ts`**

No structural changes needed — `scraped_data` already stores arbitrary JSON. The new fields (`logo_url`, `color_palette`, etc.) flow through automatically.

### Technical Details

- Image URL resolution uses `new URL(src, websiteUrl)` to handle relative paths
- Color regex: `/(?:#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|hsl\([^)]+\))/g`
- Images are not downloaded/stored — we just reference the church's own hosted URLs. This means they load from the church's CDN (fast, no storage cost, always current)
- Grok sees the image URLs as text and uses `alt` attributes, `class` names, and surrounding context to identify which is the logo vs. pastor photo
- The color palette makes each church section feel like a branded mini-site within the prayer board

### Result
Each user's My Church section becomes a beautiful, church-branded card showing their church's actual logo, colors, pastor photo, and rich formatted info — making it feel like their church's own corner of the app.

