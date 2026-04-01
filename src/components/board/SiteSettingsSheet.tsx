import { useState } from "react";
import { ResponsiveSheet as Sheet, ResponsiveSheetContent as SheetContent, ResponsiveSheetHeader as SheetHeader, ResponsiveSheetTitle as SheetTitle, ResponsiveSheetDescription as SheetDescription } from "@/components/ui/responsive-sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Volume2, Mic, Eye, Sparkles, Type, AudioLines, Sun, Moon, Trash2 as Trash2Icon } from "lucide-react";
import type { BoardPrefs } from "@/hooks/useBoardPreferences";
import { TrashBinSheet } from "@/components/TrashBinSheet";

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
  const [trashOpen, setTrashOpen] = useState(false);
  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[380px] flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg">Site Settings</SheetTitle>
          <SheetDescription className="text-xs">
            Customize your KeepPray.ing experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-8 overflow-y-auto flex-1">
          {/* ── Appearance ─────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sun className="w-3.5 h-3.5" />
              Appearance
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Switch between light and dark theme
                </p>
              </div>
              <Switch checked={false} disabled />
            </div>
            <p className="text-[10px] text-muted-foreground/60 italic">Coming soon</p>
          </section>

          <Separator />

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
                  Show full-screen caption overlay when listening to prayers read by KeepPray.ing
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

          {/* ── AI Voice ─────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AudioLines className="w-3.5 h-3.5" />
              KEEPPRAY.ING VOICE
            </h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Choose the voice that reads your prayers aloud
            </p>

            <RadioGroup
              value={prefs.tts_voice_id}
              onValueChange={(v) => onSave({ tts_voice_id: v })}
              className="space-y-3"
            >
              {[
                { id: "sal", name: "Adam", desc: "Smooth, balanced" },
                { id: "eve", name: "Eve", desc: "Energetic, upbeat" },
                { id: "ara", name: "Mary", desc: "Warm, friendly" },
                { id: "rex", name: "Lazarus", desc: "Confident, clear" },
                { id: "leo", name: "Paul", desc: "Authoritative, strong" },
              ].map((voice) => (
                <div key={voice.id} className="flex items-start gap-3">
                  <RadioGroupItem value={voice.id} id={`voice-${voice.id}`} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor={`voice-${voice.id}`} className="text-sm font-medium cursor-pointer">
                      {voice.name}
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {voice.desc}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
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
          <Separator />

          {/* ── Add a Prayer Button ──────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Quick Access
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium">Add a Prayer Button</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Show "Add a Prayer" button on my Prayer Station for quicker access
                </p>
              </div>
              <Switch
                checked={prefs.show_add_prayer_fab}
                onCheckedChange={(v) => onSave({ show_add_prayer_fab: v })}
              />
            </div>
          </section>

          <Separator />

          {/* ── Trash Bin ──────────────────── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Trash2Icon className="w-3.5 h-3.5" />
              Trash Bin
            </h3>
            <button
              onClick={() => setTrashOpen(true)}
              className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors border border-border"
            >
              <Trash2Icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Open Trash Bin</span>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Restore deleted items within 30 days
                </p>
              </div>
            </button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
    <TrashBinSheet open={trashOpen} onOpenChange={setTrashOpen} context="board" />
    </>
  );
}
