

# YouVersion SDK Integration Plan (Updated)

## Summary
Install `@youversion/platform-react-ui`, wrap the app with `YouVersionProvider`, and add "Connect YouVersion" buttons on Profile, PrayerAssist, SermonSync, **and Board** pages. Add a Verse of the Day widget to the **Prayer Board** (after the daily welcome message) and **Profile** page, each with an adjacent VerseLink. Static AuthGate verses remain hardcoded.

---

## Steps

### 1. Install SDK
Add `@youversion/platform-react-ui` to dependencies.

### 2. Environment Setup
- Store `VITE_YOUVERSION_APP_KEY` as a publishable env variable in the codebase
- User must configure redirect URLs in YouVersion Platform dashboard

### 3. Add YouVersionProvider to App.tsx
Wrap inside existing provider tree (after `TooltipProvider`, before `BrowserRouter`):
- `appKey` from `import.meta.env.VITE_YOUVERSION_APP_KEY`
- `includeAuth={true}`
- `authRedirectUrl={window.location.origin}`
- `theme="light"`

### 4. Add YouVersionAuthButton to Pages
Create reusable `YouVersionStatus.tsx` component using `useYVAuth` hook showing:
- Connected: user name, avatar, disconnect option, success message
- Disconnected: connect button with `scopes={['email', 'profile']}` and `mode="auto"`

Place on:
- **Profile** — dedicated "Connected Accounts" section
- **PrayerAssist** — connect prompt for enhanced Scripture features
- **SermonSync** — connect prompt for Bible integration
- **Board** — subtle connect option near the prayer station hero

### 5. Verse of the Day Widget
Create `VerseOfTheDay.tsx` component that:
- Fetches daily verse from YouVersion SDK (or falls back to a curated list if not connected)
- Displays the NIV verse text in the app's existing italic/muted style
- Renders a `<VerseLink>` badge adjacent to the reference

Placement:
- **Board page** — positioned directly after the daily welcome message in `PrayerStationHero`
- **Profile page** — near the top as a daily inspiration section

### 6. CSS Conflict Mitigation
Scope YouVersion SDK components to prevent Tailwind base resets from breaking SDK styles. Use a wrapper `div` with reset styles if conflicts arise.

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `@youversion/platform-react-ui` |
| `src/App.tsx` | Wrap with `YouVersionProvider` |
| `src/components/YouVersionStatus.tsx` | New: connect/status component |
| `src/components/board/VerseOfTheDay.tsx` | New: daily verse widget |
| `src/pages/Profile.tsx` | Add YouVersion section + Verse of the Day |
| `src/pages/PrayerAssist.tsx` | Add YouVersion connect prompt |
| `src/pages/SermonSync.tsx` | Add YouVersion connect prompt |
| `src/pages/Board.tsx` or `PrayerStationHero.tsx` | Add YouVersion connect + Verse of the Day |

---

## Prerequisites
- YouVersion App Key (from platform.youversion.com)
- Redirect URLs configured in YouVersion dashboard for both production and preview URLs

