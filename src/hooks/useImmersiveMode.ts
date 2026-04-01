import { useEffect, useCallback, useRef } from "react";
import type { BoardPrefs } from "@/hooks/useBoardPreferences";

function isFullscreenSupported(): boolean {
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled
  );
}

function isInFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement
  );
}

async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      await (el as any).webkitRequestFullscreen();
    }
  } catch {
    // user denied or not supported
  }
}

async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    }
  } catch {
    // not in fullscreen
  }
}

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function useImmersiveMode(
  prefs: BoardPrefs,
  savePrefs: (updates: Partial<BoardPrefs>) => void,
) {
  const internalToggle = useRef(false);
  const iOS = isIOSDevice();
  const fullscreenAvailable = isFullscreenSupported();

  // Enter/exit fullscreen when pref changes
  useEffect(() => {
    if (!fullscreenAvailable || isStandaloneMode()) return;

    if (prefs.immersive_mode && !isInFullscreen()) {
      internalToggle.current = true;
      enterFullscreen();
    } else if (!prefs.immersive_mode && isInFullscreen()) {
      internalToggle.current = true;
      exitFullscreen();
    }
  }, [prefs.immersive_mode, fullscreenAvailable]);

  // Listen for external fullscreen exit (native gesture / back button)
  useEffect(() => {
    if (!fullscreenAvailable) return;

    const handler = () => {
      // Small delay to let internalToggle clear
      setTimeout(() => {
        if (!isInFullscreen() && prefs.immersive_mode && !internalToggle.current) {
          savePrefs({ immersive_mode: false });
        }
        internalToggle.current = false;
      }, 100);
    };

    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, [prefs.immersive_mode, savePrefs, fullscreenAvailable]);

  const toggleImmersive = useCallback(
    (enabled: boolean) => {
      savePrefs({ immersive_mode: enabled });
    },
    [savePrefs],
  );

  return {
    /** true when either fullscreen API works OR iOS (show section either way) */
    isSupported: fullscreenAvailable || iOS || isStandaloneMode(),
    isStandalone: isStandaloneMode(),
    /** true on iOS where Fullscreen API is unavailable — show "Add to Home Screen" tip instead */
    isIOSLimited: iOS && !fullscreenAvailable && !isStandaloneMode(),
    isActive: prefs.immersive_mode,
    toggleImmersive,
  };
}
