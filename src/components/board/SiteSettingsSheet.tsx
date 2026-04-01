import { ResponsiveSheet as Sheet, ResponsiveSheetContent as SheetContent, ResponsiveSheetHeader as SheetHeader, ResponsiveSheetTitle as SheetTitle, ResponsiveSheetDescription as SheetDescription } from "@/components/ui/responsive-sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Volume2, Mic, Eye, Sparkles, Type, AudioLines } from "lucide-react";
import type { BoardPrefs } from "@/hooks/useBoardPreferences";

interface SiteSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: BoardPrefs;
  onSave: (updates: Partial<BoardPrefs>) => void;
  bibleTextSize?: number;
  onBibleTextSizeChange?: (size: number) => void;
  bibleTextMin?: number;
  bibleTextMax?: number;
}

export function SiteSettingsSheet({
  open,
  onOpenChange,
  prefs,
  onSave,
  bibleTextSize,
  onBibleTextSizeChange,
  bibleTextMin = 14,
  bibleTextMax = 28,
}: SiteSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[380px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg">Site Settings</SheetTitle>
          <SheetDescription className="text-xs">
            Customize your KeepPray.ing experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* ── Caption Mode ─────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5" />
              Caption Mode
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium">KeepPray.ing Voices</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Show full-screen caption overlay when listening to TTS prayers
                </p>
              </div>
              <Switch
                checked={prefs.caption_mode_tts}
                onCheckedChange={(v) => onSave({ caption_mode_tts: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Recorded Prayers
                </Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Show caption overlay when playing voice-recorded prayers
                </p>
              </div>
              <Switch
                checked={prefs.caption_mode_recorded}
                onCheckedChange={(v) => onSave({ caption_mode_recorded: v })}
              />
            </div>
          </section>

          <Separator />

          {/* ── Card Display Mode ─────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Voice Card Display
            </h3>

            <RadioGroup
              value={prefs.default_card_layout}
              onValueChange={(v) => onSave({ default_card_layout: v })}
              className="space-y-3"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="standard" id="layout-standard" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="layout-standard" className="text-sm font-medium cursor-pointer">
                    Standard
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Prayer text visible with a compact audio player below the title
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="voice-visual" id="layout-voice" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="layout-voice" className="text-sm font-medium cursor-pointer">
                    Voice Visual
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Title only — waveform visualization fills the card for an immersive feel
                  </p>
                </div>
              </div>
            </RadioGroup>
          </section>

          <Separator />

          {/* ── Visual Settings ───────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Visual
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium">Animations</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Atmospheric particles and motion effects
                </p>
              </div>
              <Switch
                checked={prefs.animations_enabled}
                onCheckedChange={(v) => onSave({ animations_enabled: v })}
              />
            </div>
          </section>

          {/* ── Bible Text Size ───────────────── */}
          {onBibleTextSizeChange && bibleTextSize != null && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Type className="w-3.5 h-3.5" />
                  Bible Text Size
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">A</span>
                  <Slider
                    value={[bibleTextSize]}
                    min={bibleTextMin}
                    max={bibleTextMax}
                    step={1}
                    onValueChange={([v]) => onBibleTextSizeChange(v)}
                    className="flex-1"
                  />
                  <span className="text-lg text-muted-foreground font-serif">A</span>
                  <span className="text-xs text-muted-foreground w-6 text-right">{bibleTextSize}</span>
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
