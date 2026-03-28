import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, Edit3, BookOpen, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

interface PrayerDraftCardProps {
  initialText: string;
}

export default function PrayerDraftCard({ initialText }: PrayerDraftCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState(initialText.trim());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    try {
      // Insert prayer card as private
      const { data: card, error: cardErr } = await supabase
        .from("prayer_cards")
        .insert({
          prayer_text: text.trim(),
          status: "private",
          source: "community",
          created_by: user.id,
          prayer_type: "standard",
        })
        .select("id")
        .single();

      if (cardErr) throw cardErr;

      // Place on user's board
      await supabase.from("user_saved_prayers").insert({
        user_id: user.id,
        prayer_id: card.id,
      });

      setSaved(true);
      toast({ title: "🙏 Prayer saved to your board", description: "You can find it on your prayer board." });
    } catch (e) {
      toast({ title: "Couldn't save prayer", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="my-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary font-medium">
          <Check className="w-5 h-5" />
          Prayer saved to your board
        </div>
        <Link to="/board" className="text-sm text-primary underline underline-offset-2 hover:text-primary/80">
          Go to your board →
        </Link>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <BookOpen className="w-4 h-4" />
        Draft Prayer
      </div>

      {editing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[120px] rounded-xl text-sm bg-background"
          rows={5}
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed italic">
          {text}
        </p>
      )}

      {user ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="rounded-xl bg-gradient-gold text-white hover:opacity-90 shadow-gold"
            size="sm"
          >
            {saving ? "Saving…" : "Accept & Save to Board"}
          </Button>
          <Button
            onClick={() => setEditing(!editing)}
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            {editing ? "Preview" : "Edit"}
          </Button>
        </div>
      ) : (
        <Link to="/auth" className="flex items-center gap-2 text-sm text-primary hover:underline">
          <LogIn className="w-4 h-4" />
          Sign in to save this prayer to your board
        </Link>
      )}
    </div>
  );
}
