

## Fix: Graceful Guest-Limited State on PrayerAssist

### Problem
When an anonymous user arrives via a VerseLink (e.g. deep-dive exegesis), the auto-sent query silently consumes the single guest message. After the AI responds, `guestLimited` becomes `true` — but `showGuestBanner` only equals `true` when `!user && guestLimited`. The timing issue: `guestLimited` is set *after* the response streams in, but `showGuestBanner` may not re-evaluate in time, leaving the textarea visible yet the `send()` function silently returning on line 131. The user can type and press Send/Enter but nothing happens — no feedback, no banner.

### Fix (single file: `src/pages/PrayerAssist.tsx`)

1. **Immediately show the guest banner after the AI response completes** — move the `setGuestLimited(true)` call so it triggers before the loading spinner clears, ensuring the banner renders in the same paint as the final message.

2. **Replace the silent `return` in `send()` with a toast** as a safety net in case the banner somehow doesn't show:
   ```
   if (!user && guestLimited) {
     toast({ title: "Continue your journey", description: "Sign up free to keep exploring Scripture together." });
     return;
   }
   ```

3. **Upgrade the guest banner copy** to be warmer and more spiritually uplifting:
   ```
   "We loved exploring that passage with you. ✦ Create a free account to continue
    your journey — save prayers, dive deeper into Scripture, and let PrayerAssist
    walk with you every day."
   ```
   Add the verse: *"For where two or three gather in my name, there am I with them." — Matthew 18:20*

4. **Fix `pr-20` padding** — change `pr-20 md:pr-4` to just `px-4` so the send button isn't pushed off-screen on mobile before the banner appears.

### Files
| File | Change |
|------|--------|
| `src/pages/PrayerAssist.tsx` | Fix silent guest-limit failure, upgrade banner copy, fix padding |

