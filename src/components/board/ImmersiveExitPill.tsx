import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";

const EDGE_ZONE = 44; // px from top/bottom that triggers reveal
const HIDE_DELAY = 3000; // ms before auto-hiding

export function ImmersiveExitPill({ onExit }: { onExit: () => void }) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, []);

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const h = window.innerHeight;
      if (y <= EDGE_ZONE || y >= h - EDGE_ZONE) {
        reveal();
      }
    };

    const handleMouse = (e: MouseEvent) => {
      const y = e.clientY;
      const h = window.innerHeight;
      if (y <= EDGE_ZONE || y >= h - EDGE_ZONE) {
        reveal();
      }
    };

    window.addEventListener("touchstart", handleTouch, { passive: true });
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("mousemove", handleMouse);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [reveal]);

  return (
    <button
      onClick={onExit}
      aria-label="Exit immersive mode"
      className={`
        fixed top-3 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-1.5 px-4 py-1.5
        rounded-full backdrop-blur-md
        bg-foreground/10 border border-foreground/15
        text-foreground/70 text-xs font-medium
        transition-all duration-500 ease-in-out
        ${visible ? "opacity-90 translate-y-0" : "opacity-[0.12] -translate-y-1"}
      `}
      style={{ touchAction: "manipulation" }}
    >
      <ChevronDown className="h-3 w-3" />
      <span>Exit Immersive</span>
    </button>
  );
}
