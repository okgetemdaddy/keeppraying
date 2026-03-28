import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "./ThemeSelector";
import { StandbyToggle } from "@/components/StandbyToggle";
import { Users, Home, PlusCircle, ListMusic, Maximize2 } from "lucide-react";

interface BoardControlBarProps {
  prefs: { theme: string; animations_enabled: boolean };
  savePrefs: (u: Record<string, unknown>) => void;
  hasPrayers: boolean;
  onAddPrayer: () => void;
  onOpenPlaylist: () => void;
  onToggleImmersive: () => void;
}

export function BoardControlBar({
  prefs,
  savePrefs,
  hasPrayers,
  onAddPrayer,
  onOpenPlaylist,
  onToggleImmersive,
}: BoardControlBarProps) {
  const btnBase =
    "rounded-xl gap-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-all";

  return (
    <div className="hidden md:block border-b border-white/8" style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(20px)" }}>
      <div className="container mx-auto px-4 sm:px-6">
        {/* Row 1 */}
        <div className="flex items-center justify-between h-11 gap-3">
          <div className="flex items-center gap-2">
            <ThemeSelector
              currentTheme={prefs.theme}
              animationsEnabled={prefs.animations_enabled}
              onThemeChange={(id) => savePrefs({ theme: id })}
              onAnimationsToggle={(v) => savePrefs({ animations_enabled: v })}
            />
            <StandbyToggle compact dark />
          </div>
          <div className="flex items-center gap-1">
            <Link to="/circles" state={{ from: "board" }}>
              <Button size="sm" variant="ghost" className={btnBase}>
                <Users className="w-4 h-4" />
                Circles
              </Button>
            </Link>
            <Link to="/family" state={{ from: "board" }}>
              <Button size="sm" variant="ghost" className={btnBase}>
                <Home className="w-4 h-4" />
                Family
              </Button>
            </Link>
            <button
              onClick={onToggleImmersive}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title="Immersive mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subtle separator */}
        <div className="border-t border-white/6" />

        {/* Row 2 */}
        <div className="flex items-center gap-2 h-11">
          <Button
            size="sm"
            className="btn-gold rounded-xl gap-1.5"
            onClick={onAddPrayer}
          >
            <PlusCircle className="w-4 h-4" />
            Add Prayer
          </Button>
          {hasPrayers && (
            <Button
              size="sm"
              variant="ghost"
              className={btnBase}
              onClick={onOpenPlaylist}
            >
              <ListMusic className="w-4 h-4" />
              Add Playlist
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
