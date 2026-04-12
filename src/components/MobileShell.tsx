/**
 * MobileShell — 430px centered app container with 5-slot bottom nav.
 * On desktop (md+), removes mobile constraints and uses DesktopNav instead.
 */

import { MobileNavV2 } from "@/components/MobileNavV2";
import { DesktopNav } from "@/components/DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  children: React.ReactNode;
  onPrayerCreated?: () => void;
}

export function MobileShell({ children, onPrayerCreated }: Props) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="min-h-screen" style={{ background: "var(--kp-bg-deep)" }}>
        <DesktopNav />
        <div className="max-w-5xl mx-auto px-4 py-4">
          {children}
        </div>
      </div>
    );
  }

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
