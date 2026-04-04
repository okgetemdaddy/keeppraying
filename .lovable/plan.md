

## Bypass Premium Gate for Beta

### Changes

**1. `src/components/bible/BibleReader.tsx` (~line 917–921)**

Comment out the premium check in `handleStudyModeEntry` with a TODO note:

```ts
// TODO: Re-enable premium gate when admin flips billing on
// Beta period — all study mode features are free
// if (userSubscriptionTier !== "premium") {
//   setShowPremiumUpsell(true);
//   return;
// }
```

**2. `src/components/bible/PremiumUpsellSheet.tsx`**

- Add an `onProceed` callback prop alongside `onClose`
- Change the "Unlock Premium" button to call `onProceed` (close sheet and continue into study mode) instead of showing a toast
- Add `// TODO: Restore StoreKit 2 / Stripe gate` comment

**3. `src/components/bible/BibleReader.tsx` (~line 3209)**

Pass an `onProceed` callback to `PremiumUpsellSheet` that closes the sheet and re-invokes the study mode flow (calling `handleStudyModeEntry` again, which will now skip the premium check and proceed to step 3):

```tsx
<PremiumUpsellSheet
  open={showPremiumUpsell}
  onClose={() => setShowPremiumUpsell(false)}
  onProceed={() => {
    setShowPremiumUpsell(false);
    handleStudyModeEntry();
  }}
/>
```

### Files
| File | Change |
|------|--------|
| `src/components/bible/BibleReader.tsx` | Comment out premium gate; pass `onProceed` to upsell sheet |
| `src/components/bible/PremiumUpsellSheet.tsx` | Add `onProceed` prop; wire "Unlock Premium" button to it |

