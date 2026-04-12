/**
 * MobileShell — 430px centered app container with 5-slot bottom nav.
 * Wraps mobile routes in the mockup's #app shell layout.
 * Only renders on mobile (< 768px).
 */

import { MobileNavV2 } from "@/components/MobileNavV2";

interface Props {
  children: React.ReactNode;
  onPrayerCreated?: () => void;
}

export function MobileShell({ children, onPrayerCreated }: Props) {
  return (
    <div
      className="relative mx-auto overflow-hidden"
      style={{
        maxWidth: 430,
        height: "100dvh",
        background: "var(--kp-bg-deep)",
      }}
    >
      {/* Screen area — scrolls independently, stops above nav */}
      <div
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{ bottom: "var(--kp-nav-height)" }}
      >
        {children}
      </div>

      <MobileNavV2 onPrayerCreated={onPrayerCreated} />
    </div>
  );
}
