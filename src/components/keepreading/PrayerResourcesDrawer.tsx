import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Mic, Wind, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PrayerResourcesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PrayerCard({ title, text }: { title?: string | null; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1 hover:shadow-prayer transition-shadow cursor-pointer">
      {title && <p className="text-sm font-semibold text-foreground truncate">{title}</p>}
      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{text}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function PrayerResourcesDrawer({ open, onOpenChange }: PrayerResourcesDrawerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState("prayers");

  // User's prayer cards
  const { data: prayers } = useQuery({
    queryKey: ["kr-prayers", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("prayer_cards")
        .select("id, title, prayer_text, voice_audio_url")
        .eq("created_by", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Breath prayers
  const { data: breaths } = useQuery({
    queryKey: ["kr-breaths", user?.id],
    enabled: !!user && open && tab === "breaths",
    queryFn: async () => {
      const { data } = await supabase
        .from("prayer_cards")
        .select("id, title, prayer_text")
        .eq("created_by", user!.id)
        .eq("prayer_type", "breath")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  // Classical prayers
  const { data: classical } = useQuery({
    queryKey: ["kr-classical"],
    enabled: open && tab === "classical",
    queryFn: async () => {
      const { data } = await supabase
        .from("classical_prayers")
        .select("id, title, prayer_text, author")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const textPrayers = prayers?.filter((p) => !p.voice_audio_url) ?? [];
  const voicePrayers = prayers?.filter((p) => !!p.voice_audio_url) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="font-display text-lg">Prayer Resources</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mb-2 grid grid-cols-4 h-9">
            <TabsTrigger value="prayers" className="text-xs gap-1"><BookOpen className="w-3.5 h-3.5" /> Prayers</TabsTrigger>
            <TabsTrigger value="voice" className="text-xs gap-1"><Mic className="w-3.5 h-3.5" /> Voice</TabsTrigger>
            <TabsTrigger value="breaths" className="text-xs gap-1"><Wind className="w-3.5 h-3.5" /> Breaths</TabsTrigger>
            <TabsTrigger value="classical" className="text-xs gap-1"><ScrollText className="w-3.5 h-3.5" /> Classic</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            <TabsContent value="prayers" className="mt-0 space-y-2">
              {textPrayers.length === 0 ? (
                <EmptyState message="Your prayer cards will appear here." />
              ) : (
                textPrayers.map((p) => <PrayerCard key={p.id} title={p.title} text={p.prayer_text} />)
              )}
            </TabsContent>

            <TabsContent value="voice" className="mt-0 space-y-2">
              {voicePrayers.length === 0 ? (
                <EmptyState message="Your voice prayers will appear here." />
              ) : (
                voicePrayers.map((p) => <PrayerCard key={p.id} title={p.title} text={p.prayer_text} />)
              )}
            </TabsContent>

            <TabsContent value="breaths" className="mt-0 space-y-2">
              {(breaths ?? []).length === 0 ? (
                <EmptyState message="Your breath prayers will appear here." />
              ) : (
                (breaths ?? []).map((p) => <PrayerCard key={p.id} title={p.title} text={p.prayer_text} />)
              )}
            </TabsContent>

            <TabsContent value="classical" className="mt-0 space-y-2">
              {(classical ?? []).length === 0 ? (
                <EmptyState message="Classical prayers will appear here." />
              ) : (
                (classical ?? []).map((p) => (
                  <PrayerCard key={p.id} title={`${p.title} — ${p.author}`} text={p.prayer_text} />
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
