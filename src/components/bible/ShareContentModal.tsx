import React, { useState, useCallback } from "react";
import { Share2, Copy, Check, Users, Home, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export type ShareContentType = "journal" | "study_session" | "note" | "bunch";

interface ShareContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ShareContentType;
  contentId: string;
  contentTitle?: string;
  contentPreview?: string;
}

export function ShareContentModal({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentTitle,
  contentPreview,
}: ShareContentModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: circles } = useQuery({
    queryKey: ["share-circles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("accountability_circle_members")
        .select("circle_id, accountability_circles(id, name)")
        .eq("user_id", user.id)
        .limit(10);
      return (data ?? []).map((d: any) => ({
        id: d.accountability_circles?.id,
        name: d.accountability_circles?.name,
        type: "circle" as const,
      })).filter((c: any) => c.id);
    },
    enabled: open && !!user,
  });

  const { data: familyRooms } = useQuery({
    queryKey: ["share-rooms", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("family_room_members")
        .select("room_id, family_rooms(id, name)")
        .eq("user_id", user.id)
        .limit(10);
      return (data ?? []).map((d: any) => ({
        id: d.family_rooms?.id,
        name: d.family_rooms?.name,
        type: "family" as const,
      })).filter((r: any) => r.id);
    },
    enabled: open && !!user,
  });

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/bible?sight=${contentId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  }, [contentId]);

  const handleShareTo = useCallback(async (targetId: string, targetType: "circle" | "family") => {
    if (!user) return;
    setSharing(true);
    try {
      // Create a prayer_cards entry for the shared content
      const label = contentType === "study_session" ? "bible_study" : "bible_journal";
      const { data: card, error: cardErr } = await supabase
        .from("prayer_cards")
        .insert({
          prayer_text: contentPreview?.slice(0, 500) || contentTitle || "Bible Sight Study",
          title: contentTitle || "Bible Sight Entry",
          labels: [label, "keepreading"],
          source: "keepreading",
          created_by: user.id,
          prayer_type: "praise",
        })
        .select("id")
        .single();

      if (cardErr || !card) throw cardErr;

      if (targetType === "circle") {
        await supabase.from("accountability_circle_prayers").insert({
          circle_id: targetId,
          prayer_id: card.id,
          shared_by: user.id,
        });
      } else {
        await supabase.from("family_room_prayers").insert({
          room_id: targetId,
          prayer_id: card.id,
          shared_by: user.id,
        });
      }

      toast.success("Shared successfully!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to share");
    } finally {
      setSharing(false);
    }
  }, [user, contentType, contentTitle, contentPreview, onOpenChange]);

  const allTargets = [...(circles ?? []), ...(familyRooms ?? [])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Share {contentType === "study_session" ? "Bible Sight Session" : contentType === "journal" ? "Journal" : contentType === "bunch" ? "Verse Bunch" : "Note"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {contentTitle && (
            <p className="text-sm text-muted-foreground italic line-clamp-2">
              "{contentTitle}"
            </p>
          )}

          {/* Copy link */}
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleCopyLink}
          >
            <span className="flex items-center gap-2">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy link"}
            </span>
          </Button>

          {/* Share targets */}
          {allTargets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Share to
              </p>
              {allTargets.map((t) => (
                <button
                  key={`${t.type}-${t.id}`}
                  onClick={() => handleShareTo(t.id, t.type)}
                  disabled={sharing}
                  className="flex items-center gap-3 w-full text-left rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  {t.type === "circle" ? (
                    <Users className="h-4 w-4 text-primary" />
                  ) : (
                    <Home className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="ml-auto text-[0.6rem] text-muted-foreground">
                    {t.type === "circle" ? "Circle" : "Family Room"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {allTargets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Join a Circle or Family Room to share content with others
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}