

## Add Real-Time Debug Panel to PaperCanvas

### Summary
Add a fixed debug overlay that polls spring and ref values every 100ms, making the zoom snap-back root cause visible in real time.

### Changes — `src/components/bible/PaperCanvas.tsx`

**1. Add debug tick state** (after line 147, near the other state):
```ts
const [debugTick, setDebugTick] = useState(0);
useEffect(() => {
  const id = setInterval(() => setDebugTick(t => t + 1), 100);
  return () => clearInterval(id);
}, []);
```

**2. Add debug panel JSX** inside the return, as a sibling after the desk `<div>` (just before the closing `</>` fragment), reading `debugTick` to suppress the unused-var warning:
```tsx
<div style={{
  position: 'fixed', top: 12, right: 12, zIndex: 9999,
  background: 'rgba(0,0,0,0.85)', color: '#0f0',
  fontFamily: 'monospace', fontSize: 11,
  padding: 10, borderRadius: 8,
  pointerEvents: 'none', minWidth: 220,
}}>
  <div>tick {debugTick}</div>
  <div>prop zoom: {zoom.toFixed(3)}</div>
  <div>spring scale: {spring.scale.get().toFixed(3)}</div>
  <div>lastGesture: {lastGestureZoom.current.toFixed(3)}</div>
  <div>committed: {committedScale.current.toFixed(3)}</div>
  <div>spring x: {spring.x.get().toFixed(1)}</div>
  <div>spring y: {spring.y.get().toFixed(1)}</div>
  <div>rotation: {spring.rotation.get().toFixed(1)}</div>
</div>
```

### What to watch for
- **prop zoom** changes after pinch → confirms `onZoomChange` fires
- **spring scale** diverges from prop zoom → something is overwriting the spring
- **lastGesture** vs prop zoom → if they match, the sync effect is correctly skipped
- **spring x/y** reset to 0 after pan → indicates the spring is being re-initialized

### File to edit

| File | Change |
|------|--------|
| `src/components/bible/PaperCanvas.tsx` | Add debug tick + debug panel |

