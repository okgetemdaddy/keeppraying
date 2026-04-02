

# iPad-Only Changes: Disable Chapter Swipe in Study Mode + Move Study Mode Section Up

## Changes

### 1. Disable chapter swipe when study mode is active (`BibleReader.tsx`)

The `motion.div` at ~line 1740 has `drag="x"` which enables horizontal swipe to change chapters. When `studyMode` is active, this conflicts with drawing gestures.

**Fix**: Conditionally disable the drag prop:
- `drag={studyMode ? false : "x"}`
- Also guard the `onDragEnd` handler similarly

This only affects the behavior when study mode is on (which is iPad/pencil-only), so mobile reading swipe remains untouched.

### 2. Move "iPad Study Mode" section near the top of Bible Sleeve (`BibleSleeveSheet.tsx`)

Currently the iPad Study Mode section is at line 641, near the bottom of the Sleeve. Move it to right after "Text Size" (line 291), before "Reading Mode".

New section order:
1. Text Size
2. **iPad Study Mode** (moved up)
3. Reading Mode
4. ...everything else

### Files Changed

| File | Change |
|------|--------|
| `BibleReader.tsx` | Set `drag={studyMode ? false : "x"}` on the chapter motion container |
| `BibleSleeveSheet.tsx` | Move the iPad Study Mode collapsible block from line 639-699 to after line 293 |

