## ⚠️ GUARDRAIL: ONE PRAYER CARD IMPLEMENTATION

**`src/components/board/PrayerCardMobile.tsx`** is the SOLE prayer card component.
- Variant `"default"` for board cards
- Variant `"compact"` for layered stack
- Variant `"fullscreen"` for prayer page/focus mode
- `isOwner` controls privacy dot & More menu visibility
- Glow, breathing, dust, 3D flip, full bar ALWAYS present
- **DO NOT** create alternate card components

---

## Phase 5: Shared Landing Overhaul, CTA Token Pass, Desktop Layout, PWA

Phases 1-4 built the mobile shell, cards, all tab screens, warrior system, drawing canvas, faith journey, and landing page. Phase 5 finishes the mockup's remaining gaps and prepares the app for production.

---

### Part A — Shared Prayer Landing Redesign

The existing `SharedPrayerLanding.tsx` (879 lines) is functional but predates the design system. Restyle it to match mockup `#shared-landing`:

1. Replace hardcoded Tailwind colors with CSS tokens throughout
2. Match mockup layout: sender avatar + "Sarah is praying for you" hero, full prayer card (reuse `PrayerCardMobile`), conversion CTA bar with "Listen" (secondary) and "Save & Pray Together" (primary gold)
3. TTS auto-play prompt on load (respect browser autoplay policies)
4. Non-authenticated flow: show full prayer, soft-sell signup below
5. Authenticated flow: "Save to Board" inserts `user_saved_prayers` + auto-forms circle with sender
6. Keep all existing logic (token lookup, comments, prayed actions) — only restyle

---

### Part B — CTA Token Conversion (Remaining Files)

Phase 4 converted `PremiumUpsellSheet`. These files still use hardcoded Tailwind colors for primary action buttons:

- `Auth.tsx` — `btn-gold` class on submit buttons, standard Tailwind on OAuth buttons. Convert submit buttons to `style={{ background: 'var(--kp-gold)', color: 'var(--kp-bg-deep)' }}`. OAuth buttons get token borders/bg.
- `InviteShareModal.tsx` — share/copy buttons
- `SharePrayerModal.tsx` — share buttons  
- `CommunityPrayerRequestModal.tsx` — submit button
- `TeamPrayerRequestModal.tsx` — submit button

Rule: keep all copy, layout, and behavior. Only swap color values to CSS token equivalents.

---

### Part C — Desktop Responsive Layout (768px+ breakpoint)

Currently mobile-only. Add desktop support:

1. **Navigation**: At `md:` breakpoint, hide `MobileNavV2` bottom tab bar. Show a top horizontal nav bar with the same 5 destinations + KeepPray.ing logo on the left.
2. **BoardV2**: 2-column card grid at `md:`, 3-column at `lg:`. Filter chips inline with header.
3. **Explore**: Side-by-side layout — prayer feed left, PrayerAssist + Request CTA cards in a right sidebar.
4. **Circles**: List view with wider cards showing more activity detail.
5. **Profile**: Center-constrained card layout (max-w-2xl) with stats row.
6. **MobileShell**: At `md:+`, remove the shell wrapper padding/overflow constraints designed for mobile viewport.

New component: `src/components/DesktopNav.tsx`
Modified: `MobileShell.tsx`, `MobileNavV2.tsx`, `BoardV2.tsx`, `ExploreMobile.tsx`, `CirclesMobile.tsx`, `ProfileMobile.tsx`

---

### Part D — PWA Setup

1. Create `public/manifest.json` with app name, icons, `display: standalone`, theme color `#0a0908`, background `#0a0908`
2. Add `<link rel="manifest">` to `index.html`
3. Create `public/sw.js` — minimal service worker that caches the app shell (HTML, CSS, JS bundles) for offline loading. Network-first strategy for API calls.
4. Register service worker in `src/main.tsx`
5. Add Apple meta tags for iOS home screen (`apple-mobile-web-app-capable`, status bar style)

---

### Part E — Performance & Code Splitting

1. Lazy-load heavy pages: `Bible`, `Admin`, `DesignLab`, `Classical`, `Help`, `Support` via `React.lazy` + `Suspense`
2. Lazy-load `DrawCanvasFullscreen` (pulls in `perfect-freehand`)
3. Add `SacredSpinner` as the Suspense fallback
4. Audit bundle — ensure Framer Motion tree-shaking is working (import only `motion`, `AnimatePresence`)

---

### Part F — Light Theme Polish

The mockup defines extensive `[data-theme="light"]` overrides (lines 66-100). Verify and fix:

1. Bottom nav background: `rgba(255,255,255,0.92)` with light border
2. Card backgrounds: white gradient, light gold borders
3. Profile menu items: white background with light borders
4. Focus mode header/bar: white backgrounds
5. All components using inline `style=` with `var(--kp-*)` tokens already work. Fix any that use hardcoded dark values.

---

### Technical Details

**New files (3):**
- `src/components/DesktopNav.tsx` — horizontal top nav for desktop
- `public/manifest.json` — PWA manifest
- `public/sw.js` — service worker

**Modified files (~12):**
- `src/pages/SharedPrayerLanding.tsx` — full restyle with tokens
- `src/pages/Auth.tsx` — token buttons
- `src/components/InviteShareModal.tsx` — token buttons
- `src/components/SharePrayerModal.tsx` — token buttons
- `src/components/CommunityPrayerRequestModal.tsx` — token buttons
- `src/components/TeamPrayerRequestModal.tsx` — token buttons
- `src/components/MobileShell.tsx` — desktop breakpoint handling
- `src/components/MobileNavV2.tsx` — hide on desktop
- `src/pages/BoardV2.tsx` — responsive grid
- `src/pages/ExploreMobile.tsx` — desktop sidebar layout
- `src/App.tsx` — lazy imports + Suspense
- `index.html` — manifest link + Apple meta tags
- `src/main.tsx` — service worker registration

**No database migrations required.**

