

## Show "Be still and know…" While the App Loads

### Problem
The SacredSpinner only renders **after** React mounts and checks auth state. On slow connections, the JS bundle hasn't even loaded yet, so users stare at a blank white screen. The spinner never appears because it lives inside React — which is the thing that's still loading.

### Solution
Add an inline HTML/CSS loading animation directly in `index.html` inside the `#root` div. It displays instantly (zero JS needed) and gets automatically replaced when React calls `createRoot().render()`.

### Single file change: `index.html`

**Inside `<div id="root">`**, add a pure-CSS version of the SacredSpinner:
- A centered sacred spiral animation