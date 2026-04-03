import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  Users,
  Home,
  BookMarked,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountabilityCircles, type Circle } from "@/hooks/useAccountabilityCircles";
import { useFamilyRooms, type FamilyRoom } from "@/hooks/useFamilyRooms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ShareMode = "main" | "circles" | "rooms";

interface CanvasExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readingAreaRef: React.RefObject<HTMLDivElement | null>;
  bookUsfm: string;
  chapterNumber: number;
  chapterTitle: string;
  versionId: number;
}

export function CanvasExportSheet({
  open,
  onOpenChange,
  readingAreaRef,
  bookUsfm,
  chapterNumber,
  chapterTitle,
  versionId,
}: CanvasExportSheetProps) {
  const { user } = useAuth();
  const { circles } = useAccountabilityCircles();
  const { rooms } = useFamilyRooms();

  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>("main");
  const [busy, setBusy] = useState<string | null>(null);

  // Capture preview on open
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setShareMode("main");
      setBusy(null);
      return;
    }
    capturePreview();
  }, [open]);

  const capturePreview = useCallback(async () => {
    if (!readingAreaRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(readingAreaRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      setPreview(dataUrl);
    } catch (err) {
      console.error("Capture failed:", err);
      toast.error("Failed to capture the canvas");
    } finally {
      setCapturing(false);
    }
  }, [readingAreaRef]);

  const downloadImage = useCallback(async () => {
    if (!preview) return;
    setBusy("image");
    try {
      const link = document.createElement("a");
      link.download = `${chapterTitle.replace(/\s+/g, "_")}_annotated.png`;
      link.href = preview;
      link.click();
      toast.success("Image saved ✨");
    } finally {
      setBusy(null);
    }
  }, [preview, chapterTitle]);

  const downloadPdf = useCallback(async () => {
    if (!preview) return;
    setBusy("pdf");
    try {
      const img = new Image();
      img.src = preview;
      await new Promise((resolve) => (img.onload = resolve));

      const pdfW = 210; // A4 mm
      const ratio = img.height / img.width;
      const pdfH = pdfW * ratio;
      const pageH = 297;

      const pdf = new jsPDF({ orientation: pdfH > pageH ? "portrait" : "portrait", unit: "mm", format: "a4" });

      // Header
      pdf.setFontSize(14);
      pdf.setTextColor(60, 50, 40);
      pdf.text(chapterTitle + " — Annotated Study", 15, 15);

      pdf.setFontSize(8);
      pdf.setTextColor(140, 130, 120);
      pdf.text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), 15, 22);

      // Image
      const imgY = 28;
      const maxImgH = pageH - imgY - 15;
      const imgH = Math.min(pdfW - 30, pdfH) > maxImgH ? maxImgH : Math.min((pdfW - 30) * ratio, maxImgH);
      const imgW = imgH / ratio;
      pdf.addImage(preview, "PNG", (pdfW - imgW) / 2, imgY, imgW, imgH);

      // Watermark footer
      pdf.setFontSize(7);
      pdf.setTextColor(180, 170, 160);
      pdf.text("Created with KeepRead.ing", pdfW / 2, pageH - 8, { align: "center" });

      pdf.save(`${chapterTitle.replace(/\s+/g, "_")}_annotated.pdf`);
      toast.success("PDF saved ✨");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setBusy(null);
    }
  }, [preview, chapterTitle]);

  const uploadToStorage = useCallback(async (): Promise<string | null> => {
    if (!preview || !user) return null;

    const blob = await (await fetch(preview)).blob();
    const fileName = `${user.id}/${bookUsfm}_${chapterNumber}_${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("study-exports")
      .upload(fileName, blob, { contentType: "image/png", upsert: false });

    if (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed");
      return null;
    }

    const { data: urlData } = supabase.storage.from("study-exports").getPublicUrl(fileName);
    return urlData.publicUrl;
  }, [preview, user, bookUsfm, chapterNumber]);

  const shareToCircle = useCallback(async (circle: Circle) => {
    if (!user) return;
    setBusy(`circle-${circle.id}`);
    try {
      const imageUrl = await uploadToStorage();
      if (!imageUrl) return;

      // Create a prayer card for this study export
      const { data: prayer, error: prayerErr } = await supabase
        .from("prayer_cards")
        .insert({
          created_by: user.id,
          prayer_text: `📖 ${chapterTitle} — Annotated Bible Study`,
          prayer_type: "standard",
          source: "personal",
          status: "approved",
          title: `${chapterTitle} Study`,
          background_url: imageUrl,
          labels: ["bible_study"],
        })
        .select("id")
        .single();

      if (prayerErr || !prayer) throw prayerErr;

      const { error: shareErr } = await supabase
        .from("accountability_circle_prayers")
        .insert({
          circle_id: circle.id,
          prayer_id: prayer.id,
          shared_by: user.id,
        });

      if (shareErr) throw shareErr;
      toast.success(`Shared to ${circle.name} 🙏`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to share");
    } finally {
      setBusy(null);
    }
  }, [user, uploadToStorage, chapterTitle, onOpenChange]);

  const shareToRoom = useCallback(async (room: FamilyRoom) => {
    if (!user) return;
    setBusy(`room-${room.id}`);
    try {
      const imageUrl = await uploadToStorage();
      if (!imageUrl) return;

      const { data: prayer, error: prayerErr } = await supabase
        .from("prayer_cards")
        .insert({
          created_by: user.id,
          prayer_text: `📖 ${chapterTitle} — Annotated Bible Study`,
          prayer_type: "standard",
          source: "personal",
          status: "approved",
          title: `${chapterTitle} Study`,
          background_url: imageUrl,
          labels: ["bible_study"],
        })
        .select("id")
        .single();

      if (prayerErr || !prayer) throw prayerErr;

      const { error: shareErr } = await supabase
        .from("family_room_prayers")
        .insert({
          room_id: room.id,
          prayer_id: prayer.id,
          shared_by: user.id,
        });

      if (shareErr) throw shareErr;
      toast.success(`Shared to ${room.name} 🏠`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to share");
    } finally {
      setBusy(null);
    }
  }, [user, uploadToStorage, chapterTitle, onOpenChange]);

  const saveToStudies = useCallback(async () => {
    if (!user) return;
    setBusy("studies");
    try {
      const imageUrl = await uploadToStorage();
      if (!imageUrl) return;

      const { error } = await supabase
        .from("study_artifacts" as any)
        .insert({
          user_id: user.id,
          book_usfm: bookUsfm,
          chapter_number: chapterNumber,
          version_id: versionId,
          title: chapterTitle,
          image_url: imageUrl,
        } as any);

      if (error) throw error;
      toast.success("Saved to My Studies 📚");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setBusy(null);
    }
  }, [user, uploadToStorage, bookUsfm, chapterNumber, versionId, chapterTitle, onOpenChange]);

  const actionItems = [
    { id: "image", icon: ImageIcon, label: "Save as Image", desc: "Download annotated chapter as PNG", action: downloadImage },
    { id: "pdf", icon: FileText, label: "Save as PDF", desc: "With title, date & watermark", action: downloadPdf },
    { id: "circles", icon: Users, label: "Share to Circle", desc: `${circles.length} circle${circles.length !== 1 ? "s" : ""} available`, action: () => setShareMode("circles") },
    { id: "rooms", icon: Home, label: "Share to Family Room", desc: `${rooms.length} room${rooms.length !== 1 ? "s" : ""} available`, action: () => setShareMode("rooms") },
    { id: "studies", icon: BookMarked, label: "Save to My Studies", desc: "Personal study artifacts library", action: saveToStudies },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-2xl border-t border-border bg-card p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-left text-base font-bold text-foreground flex items-center gap-2">
            {shareMode !== "main" && (
              <button onClick={() => setShareMode("main")} className="mr-1">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <Download className="h-4.5 w-4.5 text-amber-500" />
            {shareMode === "main" ? "Export Canvas" : shareMode === "circles" ? "Choose a Circle" : "Choose a Family Room"}
          </SheetTitle>
          <p className="text-[0.65rem] text-muted-foreground mt-0.5">
            {chapterTitle}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {/* Preview thumbnail */}
            <div className="relative rounded-xl overflow-hidden border border-border shadow-md bg-[#F5F0E8] dark:bg-neutral-900">
              {capturing ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Capturing canvas…</span>
                </div>
              ) : preview ? (
                <img
                  src={preview}
                  alt="Canvas preview"
                  className="w-full max-h-64 object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No preview available
                </div>
              )}
            </div>

            {/* Main actions */}
            {shareMode === "main" && (
              <div className="space-y-2">
                {actionItems.map(({ id, icon: Icon, label, desc, action }) => (
                  <button
                    key={id}
                    onClick={action}
                    disabled={!preview || busy !== null}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-all",
                      "hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none",
                      "bg-card shadow-sm"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Icon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{desc}</p>
                    </div>
                    {busy === id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Circle selector */}
            {shareMode === "circles" && (
              <div className="space-y-2">
                {circles.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">
                    You haven't joined any circles yet.
                  </p>
                ) : (
                  circles.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => shareToCircle(c)}
                      disabled={busy !== null}
                      className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:bg-muted/50 transition-all bg-card shadow-sm disabled:opacity-50"
                    >
                      <Users className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{c.name}</span>
                      {busy === `circle-${c.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Family room selector */}
            {shareMode === "rooms" && (
              <div className="space-y-2">
                {rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">
                    You haven't joined any family rooms yet.
                  </p>
                ) : (
                  rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => shareToRoom(r)}
                      disabled={busy !== null}
                      className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:bg-muted/50 transition-all bg-card shadow-sm disabled:opacity-50"
                    >
                      <Home className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{r.name}</span>
                      {busy === `room-${r.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
