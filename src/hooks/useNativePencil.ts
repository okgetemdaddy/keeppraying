import { useCallback, useMemo } from "react";

/**
 * @native-port — PencilKit Bridge Scaffold
 * ─────────────────────────────────────────
 *
 * Detects Capacitor native environments and provides a viewport sync
 * method for broadcasting scroll + zoom state to a native PKCanvasView.
 *
 * When `isNativeMode` is true:
 *   - The web InkOverlay should set pointerEvents: "none" (defer to native canvas)
 *   - The native PKCanvasView sits above the WKWebView as a transparent glass layer
 *   - Ink data flows through `window.webkit.messageHandlers.pencilBridge`
 *
 * ARCHITECTURE:
 *
 *   ┌─────────────────────────────────┐
 *   │  PKCanvasView (Native Metal)    │  ← 9ms latency, 240Hz sampling
 *   │  └── Glass layer (transparent)  │
 *   ├─────────────────────────────────┤
 *   │  Capacitor Bridge              │  ← Coordinate sync via postMessage
 *   ├─────────────────────────────────┤
 *   │  WKWebView (React/Tailwind)    │  ← Bible text, search, UI chrome
 *   │  └── InkOverlay (fallback)     │  ← Used on web/Android only
 *   └─────────────────────────────────┘
 */

interface NativePencilState {
  /** Whether we're running inside a Capacitor native shell with PencilKit support */
  isNativeMode: boolean;
  /** Broadcast current viewport state to the native PKCanvasView layer */
  syncViewport: (scrollY: number, zoom: number) => void;
  /** Notify native layer of pen color/size changes */
  syncToolSettings: (color: string, size: number, glow: string | null) => void;
}

export function useNativePencil(enabled: boolean): NativePencilState {
  const isNativeMode = useMemo(() => {
    if (!enabled || typeof window === "undefined") return false;
    // Detect Capacitor native platform
    const cap = (window as any).Capacitor;
    return !!(cap?.isNativePlatform?.());
  }, [enabled]);

  const syncViewport = useCallback(
    (scrollY: number, zoom: number) => {
      if (!isNativeMode) return;
      try {
        (window as any).webkit?.messageHandlers?.pencilBridge?.postMessage({
          type: "viewport_sync",
          scrollY,
          zoom,
          timestamp: performance.now(),
        });
      } catch {
        // Bridge not yet registered — silent during development
      }
    },
    [isNativeMode],
  );

  const syncToolSettings = useCallback(
    (color: string, size: number, glow: string | null) => {
      if (!isNativeMode) return;
      try {
        (window as any).webkit?.messageHandlers?.pencilBridge?.postMessage({
          type: "tool_sync",
          color,
          size,
          glow,
        });
      } catch {
        // Bridge not yet registered
      }
    },
    [isNativeMode],
  );

  return { isNativeMode, syncViewport, syncToolSettings };
}
