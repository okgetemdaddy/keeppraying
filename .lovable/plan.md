

## Plan: Dynamic "Back to" Link Based on Navigation Origin

### Approach
Create a custom hook `useBackLink` that reads the browser's referrer path to determine if the user came from `/board` or `/profile`. If so, it returns the appropriate label and path; otherwise it returns `null` (hiding the link).

### Implementation

**1. Create `src/hooks/useBackLink.ts`**
- Use `useLocation` from react-router to read `location.state?.from`
- Return `{ to: string, label: string } | null`
- `/board` → "Back to My Board"
- `/profile` → "Back to My Profile"  
- Anything else → `null`

**2. Pass navigation state from source pages**
- In `src/pages/Board.tsx`: update links to `/family` and `/circles` to pass `state={{ from: "board" }}`
- In `src/pages/Profile.tsx`: update links to `/family` and `/circles` to pass `state={{ from: "profile" }}`
- Also update any `navigate()` calls and `<Link>` components on those pages that point to `/family` or `/circles`

**3. Update `src/pages/FamilyRooms.tsx` and `src/pages/AccountabilityCircles.tsx`**
- Replace the hardcoded "Back to My Board" `<Link>` with the hook:
  ```tsx
  const backLink = useBackLink();
  // ...
  {backLink && (
    <div className="text-center pt-10">
      <Link to={backLink.to} className="text-xs text-muted-foreground hover:text-primary transition-colors">
        ← {backLink.label}
      </Link>
    </div>
  )}
  ```

**4. Also check nav sources in SiteNav, MobileTabBar, PrayerFAB**
- Any navigation to `/circles` or `/family` from these global components won't carry state, so the link correctly hides.

### Technical Detail
Using `location.state` (react-router state) is the cleanest approach — it survives the navigation but doesn't persist on page refresh (which is desired: if a user refreshes, the back link disappears since we can't confirm origin).

