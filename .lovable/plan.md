

# Platform-Aware Routing for Native iPadOS Port

## Summary

Replace the hardcoded `<BrowserRouter>` in `src/App.tsx` with a `PlatformAwareRouter` wrapper that selects `HashRouter` on native Capacitor platforms and `BrowserRouter` on web. This prevents routing crashes when the app runs inside WKWebView's `capacitor://` protocol.

## Changes

### 1. Install `@capacitor/core`

Add `@capacitor/core` as a dependency. This provides the `Capacitor.isNativePlatform()` detection API. On web, it simply returns `false` — zero runtime cost.

### 2. `src/App.tsx` — Add PlatformAwareRouter

- Update imports: add `HashRouter` from `react-router-dom` and `Capacitor` from `@capacitor/core`
- Create a `PlatformAwareRouter` component:

```tsx
function PlatformAwareRouter({ children }: { children: React.ReactNode }) {
  return Capacitor.isNativePlatform()
    ? <HashRouter>{children}</HashRouter>
    : <BrowserRouter>{children}</BrowserRouter>;
}
```

- Replace `<BrowserRouter>` in the `App` component with `<PlatformAwareRouter>`

### What stays the same

- All route definitions, `AppShell`, `KeepReadingShell`, `isKeepReading()` logic — completely untouched
- Lovable SPA fallback continues working for web (BrowserRouter path unchanged)
- No UI or behavioral changes for current web users

