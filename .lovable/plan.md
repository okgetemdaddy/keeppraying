

## Enrich My Church with Google Places API

### Problem
The website scrape often misses service hours, physical address, and building photos because many church websites bury this info in JavaScript-rendered content or don't include it at all. Google Maps has this data reliably for nearly every church.

### Strategy: Add "Pass 0" — Google Places lookup

```text
Pass 0 (Google Places):
  Church name + website URL → Text Search → Place Details
  → address, hours, phone, photos, rating, Google Maps URL

Pass 1 (Programmatic):
  HTML → images, colors, meta tags (existing)

Pass 2 (Grok):
  HTML + images + colors + Google Places data
  → Grok merges all sources into the richest possible profile
```

### Prerequisite: Google Places API Key
You'll need a Google Cloud API key with the **Places API (New)** enabled. This gives us:
- Formatted address with lat/lng
- Opening hours (service times for churches)
- Up to 10 place photos (building exterior, interior)
- Phone number, website, Google Maps link
- Rating and review count

I'll need to ask you to add a `GOOGLE_PLACES_API_KEY` secret before this can work.

### Changes

**1. Edge function: `supabase/functions/scrape-church-info/index.ts`**

Add a Google Places lookup before the existing scrape passes:

- **Text Search** using church name (+ city from website URL if parseable) to find the Google Place ID
- **Place Details** to get: `formatted_address`, `opening_hours.weekday_text`, `formatted_phone_number`, `photos[]`, `url` (Google Maps link), `rating`
- **Photo URLs** constructed from photo references: `https://places.googleapis.com/v1/{name}/media?maxWidthPx=800&key=...`
- Pass all Google data into the Grok prompt as an additional section so Grok can merge website-scraped data with Google-verified data (preferring Google for address/hours/phone when available)
- Add new fields to scraped_data: `google_maps_url`, `google_rating`, `google_photos[]`, `building_photo_url` (first exterior photo)

**2. UI: `src/components/board/MyChurchSection.tsx`**

- Show `building_photo_url` (from Google) as hero image if no website hero was found
- Display Google-verified service hours with day/time formatting
- Show Google Maps link button alongside the address
- Show Google rating badge if available
- Show a small Google-sourced building photo gallery (1-3 photos) if available

**3. Grok prompt update**

Add a new section to the prompt:
```
## GOOGLE PLACES DATA
Address: ...
Phone: ...
Hours: Sunday 9:00 AM – 12:00 PM, ...
Photos: [url1, url2, ...]
Google Maps: ...
Rating: 4.8 (120 reviews)
```

Tell Grok: "For address, phone, and service times, prefer Google Places data when available as it's more reliable. Use the Google building photo as `building_photo_url`. Merge website and Google data for the most complete profile."

### Technical Details

- Google Places API (New) pricing: ~$0.017 per Text Search + $0.017 per Place Details = ~$0.034 per church lookup (very cheap, one-time per church)
- Photos are served via Google's CDN — no storage needed, fast loading
- The photo URL format for Places API (New): `https://places.googleapis.com/v1/{photo.name}/media?maxWidthPx=800&key=KEY`
- Falls back gracefully if no Google key is set — existing scrape still works

