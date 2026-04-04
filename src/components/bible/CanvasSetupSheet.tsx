import React, { useState } from "react";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
} from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const SPACING_OPTIONS = [
  { value: "1.8", label: "Compact", multiplier: 1.8, description: "Fits more text, less room for notes" },
  { value: "2.4", label: "Comfortable", multiplier: 2.4, description: "Balanced reading and writing space" },
  { value: "2.8", label: "Generous", multiplier: 2.8, description: "Plenty of room between lines" },
  { value: "3.5", label: "Wide Open", multiplier: 3.5, description: "Maximum space for annotations" },
] as const;

interface PreviewVerse {
  number: number;
  text: string;
}

interface CanvasSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitle: string;
  chapterTitle: string;
  versionAbbr: string;
  previewVerses: PreviewVerse[];
  onConfirm: (spacing: number) => void;
}

export function CanvasSetupSheet({
  open,
  onOpenChange,
  bookTitle,
  chapterTitle,
  versionAbbr,
  previewVerses,
  onConfirm,
}: CanvasSetupSheetProps) {
  const [selectedSpacing, setSelectedSpacing] = useState("2.8");

  const spacingValue = SPACING_OPTIONS.find((o) => o.value === selectedSpacing)?.multiplier ?? 2.8;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent side="bottom" className="max-w-lg mx-auto">
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle className="text-xl font-serif">
            Create Your Canvas
          </ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {bookTitle} {chapterTitle} · {versionAbbr}
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        <div className="px-4 py-4 space-y-5">
          {/* Line Spacing selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Line Spacing</h3>
            <RadioGroup
              value={selectedSpacing}
              onValueChange={setSelectedSpacing}
              className="space-y-2"
            >
              {SPACING_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-start gap-3">
                  <RadioGroupItem value={opt.value} id={`spacing-${opt.value}`} className="mt-0.5" />
                  <Label htmlFor={`spacing-${opt.value}`} className="cursor-pointer flex-1">
                    <span className="font-medium text-sm text-foreground">
                      {opt.label}
                      <span className="text-muted-foreground font-normal ml-1.5">({opt.multiplier}×)</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Preview</h3>
            <div
              className="rounded-lg border border-border bg-card/50 p-4 overflow-hidden"
              style={{ maxHeight: 160 }}
            >
              <div
                style={{
                  fontFamily: "'EB Garamond', 'Georgia', serif",
                  fontSize: 16,
                  lineHeight: `${16 * spacingValue}px`,
                  color: "var(--foreground)",
                }}
              >
                {previewVerses.slice(0, 3).map((v) => (
                  <span key={v.number}>
                    <sup className="text-xs text-muted-foreground mr-1 font-sans">
                      {v.number}
                    </sup>
                    {v.text}{" "}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Paper Size (locked) */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Paper Size:</span>
            <span>11 × 17 in</span>
            <span className="text-muted-foreground/60">(fixed for now)</span>
          </div>
        </div>

        <ResponsiveSheetFooter className="px-4 pb-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(spacingValue)}
            className="flex-1"
          >
            Create Canvas
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
