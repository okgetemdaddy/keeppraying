

## Accept All YouTube Link Formats

### Problem
The current URL validation and video ID extraction only handle standard `youtube.com/watch?v=`, `/embed/`, `/v/`, and `youtu.be/` formats. It misses:
- Mobile share links with query params: `https://youtu.be/ABC123?si=sharetoken`
- YouTube Shorts: `youtube.com/shorts/VIDEO_ID`
- YouTube Live: `youtube.com/live/VIDEO_ID`
- Mobile domain: `m.youtube.com/watch?v=VIDEO_ID`
- Music domain: `music.youtube.com/watch?v=VIDEO_ID`
- Bare video IDs (11-char alphanumeric strings)

### Changes — single file: `src/pages/SermonSync.tsx`

**1. Update `isYouTubeUrl` (line 104-105)**
Broaden the regex to accept all known YouTube URL patterns including `shorts/`, `live/`, `m.youtube.com`, `music.youtube.com`, and `youtu.be` with query params.

**2. Update `extractVideoId` (line 107-109)**
Expand extraction regex to also match `/shorts/`, `/live/`, and handle URLs with extra query parameters (like `?si=...` on mobile share links). Also support pasting a bare 11-character video ID.

**3. Update placeholder text**
Change the input placeholder to indicate that any YouTube link format works (e.g. "Paste any YouTube link…").

