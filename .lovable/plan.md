

## Update Anonymous PrayerAssist: Allow 3 Interactions Before Signup

### Change from Previous Plan
The guest limit increases from 1 message to **3 messages**. The anonymous user gets three full send-and-receive exchanges before seeing the signup nudge. This gives them a real feel for PrayerAssist's depth.

### Flow
```
Guest arrives → suggestions + input with mic button
  → sends message #1 → receives streamed response
  → sends message #2 → receives streamed response
  → sends message #3 → receives streamed response
  → signup-nudge card inserted after 3rd response
  → input disabled, placeholder: "Sign up to continue…"
  → "Sign Up Free" CTA → /auth
```

### Changes — `src/pages/PrayerAssist.tsx`

1. **Change `GUEST_STORAGE_KEY` limit check** from `>= 1` to `>= 3` in both the mount check and the post-response increment
2. **Add mic button** next to send — uses Web Speech API (`webkitSpeechRecognition`), populates textarea with transcript
3. **After the 3rd AI response finishes streaming**, append a `signup-nudge` message to the messages array instead of immediately replacing the input
4. **`signup-nudge` card** renders inline in chat:
   - Headline: "You're off to a beautiful start ✦"
   - 4 feature pills: Save & revisit prayers, Voice-recorded prayers, Daily prayer streaks, Prayer companions
   - Scripture: Matthew 18:20
   - "Sign Up Free" amber CTA
5. **Input area**: stays visible but disabled once `guestLimited` is true, placeholder text: "Sign up to continue your conversation…"
6. **Message type**: extend `role` to `"user" | "assistant" | "signup-nudge"`

### Files
| File | Action |
|------|--------|
| `src/pages/PrayerAssist.tsx` | Update limit to 3, add mic button, add inline signup nudge card |

