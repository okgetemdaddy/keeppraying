/**
 * useApplePencilSqueeze.ts — Detects Apple Pencil Pro squeeze gesture
 *
 * CONSTRAINT: Do NOT filter e.button !== 0 — Pencil Pro squeeze reports
 * non-zero button values. This is already noted in InkOverlay.tsx's
 * pointer handling, but this hook centralizes squeeze-specific detection.
 *
 * WebKit surfaces the squeeze as a non-standard button on pointerdown:
 *   - e.button === 5 (some WebKit builds)
 *   - e.buttons & 32 (bitmask check, more reliable)
 * Exact mapping varies by Safari/WebKit version; we check both.
 *
 * USAGE:
 *   // In BibleReader.tsx or whichever component mounts the toolbar
 *   useApplePencilSqueeze((x, y) => {
 *     pencilTools.toggleSqueezeMenu(x, y);
 *   });
 *
 * iPadOS: Remove this hook entirely. Replace with:
 *   let interaction = UIPencilInteraction()
 *   interaction.delegate = self
 *   view.addInteraction(interaction)
 *   
 *   func pencilInteraction(_ interaction: UIPencilInteraction,
 *                          didReceiveSqueeze squeeze: UIPencilInteraction.Squeeze) {
 *       let location = squeeze.location(in: view)
 *       showToolPicker(at: location)
 *   }
 */

import { useEffect, useRef } from 'react';

type SqueezeCallback = (clientX: number, clientY: number) => void;

export function useApplePencilSqueeze(onSqueeze: SqueezeCallback) {
  const callbackRef = useRef(onSqueeze);
  callbackRef.current = onSqueeze;

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Only pen input
      if (e.pointerType !== 'pen') return;

      // Squeeze detection: button=5 OR bitmask check for bit 5 (32)
      const isSqueeze = e.button === 5 || (e.buttons & 32) !== 0;
      if (!isSqueeze) return;

      e.preventDefault();
      callbackRef.current(e.clientX, e.clientY);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);
}

/**
 * Hook for Apple Pencil Pro double-tap detection.
 * Double-tap is typically handled natively by UIPencilInteraction,
 * but in WebKit it may surface as a rapid pair of pointerdown events
 * with specific timing. This is a best-effort browser detection.
 *
 * iPadOS: Replace with UIPencilInteraction.didReceiveDoubleTap delegate
 */
export function useApplePencilDoubleTap(onDoubleTap: () => void) {
  const callbackRef = useRef(onDoubleTap);
  callbackRef.current = onDoubleTap;
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      // Only consider taps with no significant movement (detected via button 0)
      if (e.button !== 0) return;

      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        callbackRef.current();
        lastTapRef.current = 0; // reset
      } else {
        lastTapRef.current = now;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);
}
