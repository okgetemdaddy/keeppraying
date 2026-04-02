/**
 * Hardware-based device detection hook.
 *
 * Unlike CSS breakpoints this interrogates the actual hardware so that
 * a desktop user who resizes their browser to 800 px never triggers
 * tablet-only features and iPad Study Mode never leaks onto phone or
 * desktop.  Handles the iPadOS 13+ quirk where iPads report as
 * "Macintosh" in their User-Agent string.
 */

export interface DeviceInfo {
  /** True only on actual iPads (including iPadOS 13+ which masquerades as Mac) */
  isIPad: boolean;
  /** True on iPhones / iPods / Android phones */
  isIPhone: boolean;
  /** True on Mac / PC / Linux desktops without multi-touch */
  isDesktop: boolean;
}

function detect(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return { isIPad: false, isIPhone: false, isDesktop: true };
  }

  const ua = navigator.userAgent;

  // iPadOS 13+ reports platform === "MacIntel" but has > 1 touch point
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // iPhones, iPods, and Android phones (touch-capable mobile devices)
  const isIPhone =
    !isIPad &&
    (/iPhone|iPod/.test(ua) ||
      (/Android/.test(ua) && navigator.maxTouchPoints > 0));

  const isDesktop = !isIPad && !isIPhone;

  return { isIPad, isIPhone, isDesktop };
}

// Compute once at module load — hardware doesn't change mid-session
const DEVICE_INFO: DeviceInfo = detect();

/**
 * Returns hardware-detected device type.
 * Stable across re-renders (no state, no effect, no media queries).
 */
export function useDeviceDetect(): DeviceInfo {
  return DEVICE_INFO;
}
